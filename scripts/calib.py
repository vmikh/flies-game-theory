"""Sweep circuit gains until KC coding is sparse (~5-10% per odor) and odors are separable."""
import json, numpy as np, sys, itertools
rng = np.random.default_rng(1)
meta = json.load(open('public/data/mb_R.json')); buf = open('public/data/mb_R.bin', 'rb').read()
def arr(name):
    L = meta['layout'][name]; return np.frombuffer(buf, dtype=np.dtype(L['dtype']).newbyteorder('<'), count=L['length'], offset=L['offset'])
cls = arr('cls'); typ = arr('typ'); sign = arr('sign').astype(np.float32)
indptr = arr('indptr'); indices = arr('indices'); weights = arr('weights').astype(np.float32)
n = meta['n']; CR = meta['class_ranges']; types = np.array(meta['types'])[typ]
PN = np.arange(*CR['ALPN']); KC = np.arange(*CR['Kenyon_Cell']); MBON = np.arange(*CR['MBON']); DAN = np.arange(*CR['DAN']); APL = CR['APL'][0]
PN_exc = PN[sign[PN] > 0]
V_REST, V_TH, V_RESET, TAU_M, TAU_SYN, REFRAC = -52.0, -45.0, -52.0, 20.0, 5.0, 2.0
# per-edge effective weight (mV), precomputed with class-pair scaling
def build_w(kc_kc, pn_kc, apl_kc, kc_apl, base=0.275):
    w = weights * sign[np.repeat(np.arange(n), np.diff(indptr))] * base
    pre = np.repeat(np.arange(n), np.diff(indptr)); post = indices
    isKC = lambda x: (x >= KC[0]) & (x < KC[-1]+1); isPN = lambda x: (x >= PN[0]) & (x < PN[-1]+1)
    w[isKC(pre) & isKC(post)] *= kc_kc; w[isPN(pre) & isKC(post)] *= pn_kc
    w[(pre == APL) & isKC(post)] *= apl_kc; w[isKC(pre) & (post == APL)] *= kc_apl
    return w.astype(np.float32)
def run(W, odor_pn, T=300, odor_rate=0.10, kick=12.0):
    v = np.full(n, V_REST, np.float32); I = np.zeros(n, np.float32); ref = np.zeros(n, np.float32); spikes = np.zeros(n, np.int32)
    for t in range(T):
        I[odor_pn] += (rng.random(len(odor_pn)) < odor_rate) * kick
        v += ((V_REST - v) / TAU_M + I / TAU_SYN) * (ref <= 0); I -= I / TAU_SYN; ref -= 1
        fired = np.where(v >= V_TH)[0]
        if len(fired):
            v[fired] = V_RESET; ref[fired] = REFRAC; spikes[fired] += 1
            for i in fired:
                s, e = indptr[i], indptr[i+1]
                if e > s: np.add.at(I, indices[s:e], W[s:e])
    return spikes
odors = [rng.choice(PN_exc, size=int(0.15*len(PN_exc)), replace=False) for _ in range(2)]
grid = [(kk, pk, ak) for kk in [0.0, 0.1] for pk in [1.0, 0.5, 0.3] for ak in [1.0, 3.0]]
for kk, pk, ak in grid:
    W = build_w(kk, pk, ak, 1.0)
    sp = [run(W, od) for od in odors]
    kc = [s[KC] > 0 for s in sp]
    frac = [k.mean() for k in kc]; ov = (kc[0] & kc[1]).sum() / max(1, min(kc[0].sum(), kc[1].sum()))
    print(f'kc_kc={kk} pn_kc={pk} apl_kc={ak}: KC active {100*frac[0]:.1f}% {100*frac[1]:.1f}%  overlap {ov:.2f}  KC spikes {sp[0][KC].sum()}  MBON {sp[0][MBON].sum()}  DAN {sp[0][DAN].sum()}  APL {sp[0][APL]}', flush=True)

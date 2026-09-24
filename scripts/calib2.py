"""Calibration v2: odors = random subsets of glomeruli; per-KC normalisation of PN input; sweep gains."""
import json, numpy as np, pandas as pd, sys
rng = np.random.default_rng(1)
meta = json.load(open('public/data/mb_R.json')); buf = open('public/data/mb_R.bin', 'rb').read()
def arr(name):
    L = meta['layout'][name]; return np.frombuffer(buf, dtype=np.dtype(L['dtype']).newbyteorder('<'), count=L['length'], offset=L['offset'])
cls = arr('cls'); typ = arr('typ'); sign = arr('sign').astype(np.float32)
indptr = arr('indptr'); indices = arr('indices'); weights = arr('weights').astype(np.float32)
n = meta['n']; CR = meta['class_ranges']; types = np.array(meta['types'])[typ]
PN = np.arange(*CR['ALPN']); KC = np.arange(*CR['Kenyon_Cell']); MBON = np.arange(*CR['MBON']); DAN = np.arange(*CR['DAN']); APL = CR['APL'][0]
pre = np.repeat(np.arange(n), np.diff(indptr)); post = indices
isKC = lambda x: (x >= KC[0]) & (x <= KC[-1]); isPN = lambda x: (x >= PN[0]) & (x <= PN[-1])
# glomeruli: uniglomerular cholinergic PNs, name '<glom>_<lineage>' not starting with 'M_'
uni = [i for i in PN if sign[i] > 0 and '_' in types[i] and not types[i].startswith('M_')]
glom = {}
for i in uni: glom.setdefault(types[i].split('_')[0], []).append(i)
gl_names = sorted(glom); print('glomeruli', len(gl_names), 'uniglomerular ACh PNs', len(uni))
def make_odor(frac=0.25):
    g = rng.choice(gl_names, size=max(1, int(frac*len(gl_names))), replace=False)
    return np.array(sorted(sum((glom[x] for x in g), [])))
V_REST, V_TH, V_RESET, TAU_M, TAU_SYN, REFRAC = -52.0, -45.0, -52.0, 20.0, 5.0, 2.0
def build_w(pn_kc, apl_kc, normalise, base=0.275, kc_kc=0.0):
    w = weights * sign[pre] * base
    m_pk = isPN(pre) & isKC(post)
    if normalise:   # equalise total PN drive per KC
        tot = np.bincount(post[m_pk], weights=w[m_pk], minlength=n)
        med = np.median(tot[KC][tot[KC] > 0]); f = np.where(tot > 0, med / np.maximum(tot, 1e-9), 1.0)
        w[m_pk] *= f[post[m_pk]]
    w[isKC(pre) & isKC(post)] *= kc_kc; w[m_pk] *= pn_kc; w[(pre == APL) & isKC(post)] *= apl_kc
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
odors = [make_odor() for _ in range(4)]
print('odor sizes', [len(o) for o in odors])
for normalise in [False, True]:
    for pn_kc in [0.4, 0.6, 0.8, 1.0]:
        for apl_kc in [1.0, 2.0]:
            W = build_w(pn_kc, apl_kc, normalise)
            sp = [run(W, od) for od in odors]; kc = [s[KC] > 0 for s in sp]
            frac = np.mean([k.mean() for k in kc])
            ovs = [(kc[a] & kc[b]).sum() / max(1, min(kc[a].sum(), kc[b].sum())) for a in range(4) for b in range(a+1, 4)]
            print(f'norm={normalise!s:5} pn_kc={pn_kc} apl_kc={apl_kc}: KC active {100*frac:5.1f}%  overlap {np.mean(ovs):.2f} (chance {frac:.2f})  KC spk {sp[0][KC].sum():5d}  MBON {sp[0][MBON].sum():4d}  DAN {sp[0][DAN].sum():4d}  APL {sp[0][APL]}', flush=True)

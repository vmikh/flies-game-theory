"""Prototype: LIF simulation of the MB circuit + dopamine-gated KC->MBON depression.
Checks (1) odors give sparse, distinct KC codes, (2) pairing odor A with PPL1 (punishment)
flips A's readout toward avoidance, PAM (reward) toward approach, and B is unaffected.
Mirrors the algorithm that will be ported to TypeScript (1 ms Euler, CSR, current synapses).
"""
import json, numpy as np, sys
rng = np.random.default_rng(int(sys.argv[1]) if len(sys.argv) > 1 else 1)
meta = json.load(open('public/data/mb_R.json')); buf = open('public/data/mb_R.bin', 'rb').read()
def arr(name):
    L = meta['layout'][name]; dt = np.dtype(L['dtype']).newbyteorder('<')
    return np.frombuffer(buf, dtype=dt, count=L['length'], offset=L['offset'])
cls = arr('cls'); typ = arr('typ'); sign = arr('sign').astype(np.float32)
indptr = arr('indptr'); indices = arr('indices'); weights = arr('weights').astype(np.float32)
n = meta['n']; types = meta['types']; CR = meta['class_ranges']
PN = np.arange(*CR['ALPN']); KC = np.arange(*CR['Kenyon_Cell']); MBON = np.arange(*CR['MBON']); DAN = np.arange(*CR['DAN'])
tname = np.array(types)[typ]
PAM = DAN[np.char.startswith(tname[DAN], 'PAM')]; PPL1 = DAN[np.char.startswith(tname[DAN], 'PPL1')]
PN_exc = PN[sign[PN] > 0]

# --- MBON valence from neurotransmitter (Aso et al. 2014): glutamatergic -> avoidance, ACh/GABA -> approach
nt_sign = sign[MBON]
# sign array: ACh=+1, GABA/Glu=-1; need NT names -> reload from json nt_counts? simpler: recompute from nodes feather
import pandas as pd
nodes = pd.read_feather('data/derived/mb_nodes_R.feather')
nodes['ord'] = nodes['cls'].map({'ALPN':0,'Kenyon_Cell':1,'MBON':2,'DAN':3,'APL':4,'DPM':5})
nodes = nodes.sort_values(['ord','type','bodyId']).reset_index(drop=True)
assert (nodes['bodyId'].to_numpy() == np.array(meta['bodyIds'])).all()
mb_nt = nodes.loc[MBON, 'nt'].fillna('').str.lower().to_numpy()
AVOID = MBON[mb_nt == 'glutamate']; APPROACH = MBON[np.isin(mb_nt, ['acetylcholine', 'gaba'])]
print('MBON approach', len(APPROACH), 'avoid', len(AVOID))

# --- dense KC->MBON weight matrix (plastic) and DAN->MBON compartment map
W_kc_mbon = np.zeros((len(KC), len(MBON)), np.float32)
comp = np.zeros((len(DAN), len(MBON)), np.float32)
kc0, mb0, dan0 = KC[0], MBON[0], DAN[0]
for i in range(n):
    for k in range(indptr[i], indptr[i+1]):
        j = indices[k]
        if kc0 <= i < kc0+len(KC) and mb0 <= j < mb0+len(MBON): W_kc_mbon[i-kc0, j-mb0] = weights[k]
        if dan0 <= i < dan0+len(DAN) and mb0 <= j < mb0+len(MBON): comp[i-dan0, j-mb0] = weights[k]
comp /= comp.sum(0, keepdims=True) + 1e-9   # each MBON's DAN input normalised
W0 = W_kc_mbon.copy(); plastic = np.ones_like(W_kc_mbon)   # multiplicative factor in [0,1]
print('KC->MBON nonzero', int((W0 > 0).sum()), 'PAM->MBON mass by valence: approach %.2f avoid %.2f' % (
    comp[np.isin(DAN, PAM)][:, np.isin(MBON, APPROACH)].sum(), comp[np.isin(DAN, PAM)][:, np.isin(MBON, AVOID)].sum()))
print('PPL1->MBON mass by valence: approach %.2f avoid %.2f' % (
    comp[np.isin(DAN, PPL1)][:, np.isin(MBON, APPROACH)].sum(), comp[np.isin(DAN, PPL1)][:, np.isin(MBON, AVOID)].sum()))

# --- LIF params (mV, ms); Shiu et al. 2024 style
V_REST, V_TH, V_RESET, TAU_M, TAU_SYN, REFRAC = -52.0, -45.0, -52.0, 20.0, 5.0, 2.0
W_SCALE = 0.275   # mV per synapse (Shiu et al.)
def run(odor_pn, T=400, dan_drive=None, dan_rate=0.0, odor_rate=0.10, learn=False, eta=0.02):
    global plastic
    v = np.full(n, V_REST, np.float32); I = np.zeros(n, np.float32); ref = np.zeros(n, np.float32)
    spikes = np.zeros(n, np.int32); kc_trace = np.zeros(len(KC), np.float32)
    ext = np.zeros(n, np.float32)
    for t in range(T):
        # external Poisson drive (as instantaneous current kicks)
        kick = np.zeros(n, np.float32)
        kick[odor_pn] += (rng.random(len(odor_pn)) < odor_rate) * 12.0   # ~100 Hz input, 12 mV per event
        if dan_drive is not None and t > 50:
            kick[dan_drive] += (rng.random(len(dan_drive)) < dan_rate) * 12.0
        I += kick
        v += ((V_REST - v) / TAU_M + I / TAU_SYN) * 1.0 * (ref <= 0)
        I -= I / TAU_SYN
        ref -= 1
        fired = np.where(v >= V_TH)[0]
        if len(fired):
            v[fired] = V_RESET; ref[fired] = REFRAC; spikes[fired] += 1
            for i in fired:
                s, e = indptr[i], indptr[i+1]
                if e > s:
                    w = weights[s:e] * sign[i] * W_SCALE
                    if kc0 <= i < kc0+len(KC):   # apply plastic factor to KC->MBON targets
                        tgt = indices[s:e]; m = (tgt >= mb0) & (tgt < mb0+len(MBON))
                        w = w.copy(); w[m] *= plastic[i-kc0, tgt[m]-mb0]
                    np.add.at(I, indices[s:e], w)
            kc_f = fired[(fired >= kc0) & (fired < kc0+len(KC))] - kc0
            kc_trace[kc_f] += 1.0
            if learn:
                dan_f = fired[(fired >= dan0) & (fired < dan0+len(DAN))] - dan0
                if len(dan_f):
                    d = comp[dan_f].sum(0)                 # per-MBON dopamine this ms
                    plastic -= eta * np.outer(kc_trace, d) * plastic
                    np.clip(plastic, 0.05, 1.0, out=plastic)
        kc_trace *= np.exp(-1/200)     # eligibility trace ~200 ms
    return spikes
def readout(sp):
    ap = sp[APPROACH].sum(); av = sp[AVOID].sum(); return ap, av, (ap - av) / (ap + av + 1e-9)

odors = [rng.choice(PN_exc, size=int(0.15*len(PN_exc)), replace=False) for _ in range(3)]
codes = []
for k, od in enumerate(odors):
    sp = run(od); kc = sp[KC] > 0; codes.append(kc)
    print(f'odor {k}: PN spikes {sp[PN].sum()}, KC active {kc.sum()}/{len(KC)} ({100*kc.mean():.1f}%), MBON spikes {sp[MBON].sum()}, DAN spikes {sp[DAN].sum()}, readout {readout(sp)}')
print('KC overlap 0-1: %.2f  0-2: %.2f' % ((codes[0]&codes[1]).sum()/max(1,codes[0].sum()), (codes[0]&codes[2]).sum()/max(1,codes[0].sum())))

print('\n--- pair odor 0 with PPL1 (punishment), 3 trials')
for trial in range(3): run(odors[0], dan_drive=PPL1, dan_rate=0.15, learn=True)
for k in range(2): print(f'odor {k} after punishment: readout {readout(run(odors[k]))}')
print('plastic factor mean approach %.3f avoid %.3f' % (plastic[:, np.isin(MBON, APPROACH)].mean(), plastic[:, np.isin(MBON, AVOID)].mean()))
print('\n--- pair odor 1 with PAM (reward), 3 trials')
for trial in range(3): run(odors[1], dan_drive=PAM, dan_rate=0.15, learn=True)
for k in range(3): print(f'odor {k} after reward on 1: readout {readout(run(odors[k]))}')

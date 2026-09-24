"""Prototype v3: + KC->MBON input normalisation per MBON, eta=0.15, per-group mean-rate readout."""
import numpy as np, sys, pandas as pd
ETA = float(sys.argv[1]) if len(sys.argv) > 1 else 0.15; PN_KC = 2.5; NORM_KM = (sys.argv[2] if len(sys.argv) > 2 else '1') == '1'
sys.argv = ['x']; exec(open('scripts/calib2.py').read().split("odors = [make_odor()")[0])
W = build_w(PN_KC, 1.0, True); W[isPN(pre) & isPN(post)] = 0
nodes = pd.read_feather('data/derived/mb_nodes_R.feather')
nodes['ord'] = nodes['cls'].map({'ALPN':0,'Kenyon_Cell':1,'MBON':2,'DAN':3,'APL':4,'DPM':5}); nodes = nodes.sort_values(['ord','type','bodyId']).reset_index(drop=True)
mb_nt = nodes.loc[MBON, 'nt'].fillna('').str.lower().to_numpy()
AVOID = MBON[mb_nt == 'glutamate']; APPROACH = MBON[np.isin(mb_nt, ['acetylcholine', 'gaba'])]
print('avoid MBON types:', sorted(set(types[AVOID])))
PAM = DAN[np.char.startswith(types[DAN], 'PAM')]; PPL1 = DAN[np.char.startswith(types[DAN], 'PPL1')]
isMB = lambda x: (x >= MBON[0]) & (x <= MBON[-1]); isDAN = lambda x: (x >= DAN[0]) & (x <= DAN[-1])
m_km = isKC(pre) & isMB(post)
if NORM_KM:
    tot = np.bincount(post[m_km], weights=W[m_km], minlength=n); med = np.median(tot[MBON][tot[MBON] > 0])
    W[m_km] *= (med / np.maximum(tot, 1e-9))[post[m_km]]
pl_edges = np.where(m_km)[0]; plastic = np.ones(len(pl_edges), np.float32)
pl_pre = pre[pl_edges] - KC[0]; pl_post = post[pl_edges] - MBON[0]
comp = np.zeros((len(DAN), len(MBON)), np.float32)
for k in np.where(isDAN(pre) & isMB(post))[0]: comp[pre[k]-DAN[0], post[k]-MBON[0]] += weights[k]
comp /= comp.sum(0, keepdims=True) + 1e-9
def run2(odor_pn, T=400, dan_drive=None, dan_rate=0.15, learn=False, odor_rate=0.10, kick=12.0):
    global plastic
    Weff = W.copy()
    v = np.full(n, V_REST, np.float32); I = np.zeros(n, np.float32); ref = np.zeros(n, np.float32); spikes = np.zeros(n, np.int32); tr = np.zeros(len(KC), np.float32)
    for t in range(T):
        I[odor_pn] += (rng.random(len(odor_pn)) < odor_rate) * kick
        if dan_drive is not None and t > 50: I[dan_drive] += (rng.random(len(dan_drive)) < dan_rate) * kick
        v += ((V_REST - v) / TAU_M + I / TAU_SYN) * (ref <= 0); I -= I / TAU_SYN; ref -= 1
        fired = np.where(v >= V_TH)[0]
        if len(fired):
            v[fired] = V_RESET; ref[fired] = REFRAC; spikes[fired] += 1
            Weff[pl_edges] = W[pl_edges] * plastic
            for i in fired:
                s, e = indptr[i], indptr[i+1]
                if e > s: np.add.at(I, indices[s:e], Weff[s:e])
            kf = fired[isKC(fired)] - KC[0]; tr[kf] += 1
            if learn:
                df = (fired[np.isin(fired, dan_drive)] - DAN[0]) if dan_drive is not None else np.array([], int)
                if len(df):
                    d = comp[df].sum(0); plastic = np.maximum(0.05, plastic - ETA * tr[pl_pre] * d[pl_post] * plastic)
        tr *= np.exp(-1/200)
    return spikes
def readout(sp):
    ap, av = sp[APPROACH].mean(), sp[AVOID].mean(); return f'ap {ap:5.2f} av {av:5.2f} score {ap-av:+6.2f}'
odors = [make_odor() for _ in range(3)]
for k, od in enumerate(odors):
    sp = run2(od); print(f'odor {k}: KC active {100*(sp[KC]>0).mean():.1f}%  MBON spk {sp[MBON].sum()}  PAM {sp[PAM].sum()} PPL1 {sp[PPL1].sum()}  {readout(sp)}')
print('--- punish odor 0 (PPL1) x3'); [run2(odors[0], dan_drive=PPL1, learn=True) for _ in range(3)]
for k in range(3): print(f'  odor {k}: {readout(run2(odors[k]))}')
print('  plastic mean approach %.3f avoid %.3f' % (plastic[np.isin(pl_post + MBON[0], APPROACH)].mean(), plastic[np.isin(pl_post + MBON[0], AVOID)].mean()))
print('--- reward odor 1 (PAM) x3'); [run2(odors[1], dan_drive=PAM, learn=True) for _ in range(3)]
for k in range(3): print(f'  odor {k}: {readout(run2(odors[k]))}')
print('  plastic mean approach %.3f avoid %.3f' % (plastic[np.isin(pl_post + MBON[0], APPROACH)].mean(), plastic[np.isin(pl_post + MBON[0], AVOID)].mean()))

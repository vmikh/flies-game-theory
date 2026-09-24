"""Disjoint odours (k glomeruli each, no overlap) + baseline-subtracted score; test selectivity of learning."""
import numpy as np, sys
from mbsim import MB
K = int(sys.argv[1]) if len(sys.argv) > 1 else 7; PN_KC = float(sys.argv[2]) if len(sys.argv) > 2 else 2.5; KM = 12.0; NOD = 4; T = 600
mb = MB(pn_kc=PN_KC, kc_mbon=KM)
Tn = mb.types
AP = mb.MBON[np.isin(Tn[mb.MBON], ['MBON11', 'MBON12', 'MBON14'])]; AV = mb.MBON[np.isin(Tn[mb.MBON], ['MBON01', 'MBON02', 'MBON03', 'MBON05', 'MBON06'])]
gl = list(mb.rng.permutation(mb.gl_names))
odors = [np.array(sorted(sum((mb.glom[g] for g in gl[i*K:(i+1)*K]), []))) for i in range(NOD)]
score = lambda sp: sp[AP].mean() - sp[AV].mean()
def measure(od, reps=2): 
    s = [score(mb.run(od, T=T)) for _ in range(reps)]; return np.mean(s)
sp = [mb.run(od, T=T) for od in odors]
print(f'K={K} pn_kc={PN_KC}: odor PNs {[len(o) for o in odors]}  KC active {[round(100*(s[mb.KC]>0).mean(),1) for s in sp]}%  MBON tot {[int(s[mb.MBON].sum()) for s in sp]}')
base = np.array([measure(od) for od in odors]); print('baseline scores', base.round(2))
def report(tag):
    cur = np.array([measure(od) for od in odors]); print(f'{tag}: Δscore vs baseline {np.round(cur - base, 2)}')
for _ in range(3): mb.run(odors[0], dan_drive=mb.PPL1, learn=True)
report('after PPL1 on odor 0')
for _ in range(3): mb.run(odors[1], dan_drive=mb.PAM, learn=True)
report('after PAM  on odor 1')
for _ in range(3): mb.run(odors[0], dan_drive=mb.PAM, learn=True)
report('after PAM  on odor 0 (forgiveness?)')

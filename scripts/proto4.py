import numpy as np, pandas as pd, sys
from mbsim import MB
KM = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
mb = MB(kc_mbon=KM)
T = mb.types
# canonical valence MBONs (Aso et al. 2014): activation -> approach / avoidance
APPROACH_T = ['MBON11', 'MBON12', 'MBON14']   # γ1pedc>α/β, γ2α'1, α3 — PPL1 (punishment) compartments; active -> approach
AVOID_T = ['MBON01', 'MBON02', 'MBON03', 'MBON05', 'MBON06']   # γ5β'2a, β2β'2a, β'2mp, γ4>γ1γ2, β1>α — PAM (reward) compartments; active -> avoid
AP = mb.MBON[np.isin(T[mb.MBON], APPROACH_T)]; AV = mb.MBON[np.isin(T[mb.MBON], AVOID_T)]
#print('approach ids', list(zip(T[AP], mb.mb_nt[AP-mb.MBON[0]])), '\navoid ids', list(zip(T[AV], mb.mb_nt[AV-mb.MBON[0]])))
def readout(sp):
    ap, av = sp[AP].mean(), sp[AV].mean(); return f'ap {ap:5.2f} av {av:5.2f} score {ap-av:+6.2f}   ap {list(map(int, sp[AP]))} av {list(map(int, sp[AV]))}'
odors = [mb.make_odor() for _ in range(3)]
for k, od in enumerate(odors):
    sp = mb.run(od); print(f'odor {k}: KC {100*(sp[mb.KC]>0).mean():.1f}%  {readout(sp)}')
print('--- punish odor 0 (PPL1) x3'); [mb.run(odors[0], dan_drive=mb.PPL1, learn=True) for _ in range(3)]
for k in range(3): print(f'  odor {k}: {readout(mb.run(odors[k]))}')
print('--- reward odor 1 (PAM) x3'); [mb.run(odors[1], dan_drive=mb.PAM, learn=True) for _ in range(3)]
for k in range(3): print(f'  odor {k}: {readout(mb.run(odors[k]))}')

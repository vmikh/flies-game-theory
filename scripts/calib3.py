import numpy as np, sys
sys.argv = ['x']; exec(open('scripts/calib2.py').read().split("odors = [make_odor()")[0])
def build_w2(pn_kc, apl_kc, pn_pn=0.0, normalise=True, base=0.275, kc_kc=0.0):
    w = build_w(pn_kc, apl_kc, normalise, base, kc_kc)
    w[isPN(pre) & isPN(post)] *= pn_pn
    return w
odors = [make_odor() for _ in range(5)]
for pn_kc in [0.6, 0.8, 1.0, 1.2, 1.5]:
    for apl_kc in [0.5, 1.0, 2.0]:
        W = build_w2(pn_kc, apl_kc)
        sp = [run(W, od) for od in odors]; kc = [s[KC] > 0 for s in sp]
        frac = np.mean([k.mean() for k in kc])
        ovs = [(kc[a] & kc[b]).sum() / max(1, min(kc[a].sum(), kc[b].sum())) for a in range(5) for b in range(a+1, 5)]
        nonodor = np.mean([len(np.setdiff1d(PN[s[PN] > 0], od)) for s, od in zip(sp, odors)])
        print(f'pn_kc={pn_kc} apl_kc={apl_kc}: KC active {100*frac:5.1f}%  overlap {np.mean(ovs):.2f} (chance {frac:.2f})  non-odor PNs firing {nonodor:.0f}  KC spk {sp[0][KC].sum():5d}  MBON {sp[0][MBON].sum():4d}  DAN {sp[0][DAN].sum():4d}  APL {sp[0][APL]}', flush=True)

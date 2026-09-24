import numpy as np, sys
sys.argv = ['x']; exec(open('scripts/calib2.py').read().split("odors = [make_odor()")[0])
odors = [make_odor() for _ in range(3)]
W = build_w(0.6, 1.0, True)
for k, od in enumerate(odors):
    sp = run(W, od)
    pn_f = PN[sp[PN] > 0]; off = np.setdiff1d(pn_f, od)
    kc_f = KC[sp[KC] > 0]
    print(f'odor {k}: odor PNs {len(od)} fired {np.isin(od, pn_f).sum()}, NON-odor PNs firing {len(off)} (spikes {sp[off].sum()}), of which ACh {int((sign[off]>0).sum())} GABA {int((sign[off]<0).sum())}')
    print('   non-odor PN types:', sorted(set(types[off]))[:12])
    from collections import Counter
    print('   active KC types:', Counter(types[kc_f]).most_common(6))
    # what drives the active KCs? sum of W from odor PNs vs from other firing neurons
    m = isKC(post) & np.isin(post, kc_f)
    src_cls = np.array(meta['classes'])[cls[pre[m]]]
    drive = {}
    for c in set(src_cls):
        mm = m & (np.array(meta['classes'])[cls[pre]] == c) & (sp[pre] > 0)
        drive[c] = float((W[mm] * sp[pre[mm]]).sum())
    print('   drive into active KCs by source class (W*spikes):', {k: round(v) for k, v in drive.items()})

import numpy as np, sys, pandas as pd
sys.argv = ['x', '0.15', '1']; exec(open('scripts/proto3.py').read().split("odors = [make_odor()")[0])
od = make_odor(); sp = run2(od, T=400)
rows = []
for j in MBON:
    inc = post == j
    kc_in = W[inc & isKC(pre)].sum(); mb_in = W[inc & isMB(pre)].sum(); apl_in = W[inc & (pre == APL)].sum(); pn_in = W[inc & isPN(pre)].sum()
    # inhibitory MBON inputs that actually fired
    src = pre[inc & isMB(pre)]; act_inh = float(sum(W[k] * sp[pre[k]] for k in np.where(inc & isMB(pre))[0]))
    rows.append(dict(type=types[j], nt=mb_nt[j-MBON[0]], val='AVOID' if j in AVOID else 'appr', spikes=int(sp[j]), kc_in=round(kc_in), mbon_in=round(mb_in), apl_in=round(apl_in), pn_in=round(pn_in), mbon_in_x_spikes=round(act_inh)))
df = pd.DataFrame(rows).sort_values(['val', 'spikes'], ascending=[True, False]); pd.set_option('display.width', 200); print(df.to_string(index=False))
print('APL spikes', sp[APL], ' DPM', sp[CR['DPM'][0]])

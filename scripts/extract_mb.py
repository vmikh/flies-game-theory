"""Extract the right-hemisphere mushroom body circuit from the Male CNS v1.0 connectome.

Inputs (data/raw): body-annotations, body-neurotransmitters, connectome-weights (feather).
Outputs (data/derived): mb_nodes.feather, mb_edges.feather, mb_summary.json
"""
import json, sys, time
import numpy as np, pandas as pd, pyarrow.feather as f

SIDE = sys.argv[1] if len(sys.argv) > 1 else 'R'
CLASSES = ['ALPN', 'Kenyon_Cell', 'MBON', 'DAN']
HELPER_TYPES = ['APL', 'DPM']

t0 = time.time()
a = pd.read_feather('data/raw/body-annotations.feather')
nt = pd.read_feather('data/raw/body-neurotransmitters.feather')[['body', 'consensus_nt', 'predicted_nt_confidence']]

sel = a[(a['somaSide'] == SIDE) & (a['class'].isin(CLASSES) | a['type'].isin(HELPER_TYPES))].copy()
sel['cls'] = sel['class'].where(sel['class'].notna(), sel['type'])
nodes = sel[['bodyId', 'cls', 'type', 'instance', 'somaSide', 'somaLocation']].merge(
    nt, left_on='bodyId', right_on='body', how='left').drop(columns='body')
nodes = nodes.rename(columns={'consensus_nt': 'nt', 'predicted_nt_confidence': 'nt_conf'})
ids = set(nodes['bodyId'])
print(f'nodes: {len(nodes)}  ({time.time()-t0:.1f}s)')
print(nodes.groupby('cls').size().to_string())

w = f.read_table('data/raw/connectome-weights.feather').to_pandas()
edges = w[w['body_pre'].isin(ids) & w['body_post'].isin(ids)].reset_index(drop=True)
print(f'edges inside circuit: {len(edges)}  synapses: {edges.weight.sum()}  ({time.time()-t0:.1f}s)')

cls = nodes.set_index('bodyId')['cls']
edges['pre_cls'] = edges['body_pre'].map(cls); edges['post_cls'] = edges['body_post'].map(cls)
mat = edges.groupby(['pre_cls', 'post_cls'])['weight'].agg(['count', 'sum']).reset_index()
print(mat.sort_values('sum', ascending=False).to_string(index=False))

nodes.to_feather(f'data/derived/mb_nodes_{SIDE}.feather')
edges.to_feather(f'data/derived/mb_edges_{SIDE}.feather')
summary = {
    'side': SIDE, 'n_nodes': int(len(nodes)), 'n_edges': int(len(edges)), 'n_synapses': int(edges.weight.sum()),
    'by_class': nodes.groupby('cls').size().to_dict(),
    'class_matrix': [dict(pre=r.pre_cls, post=r.post_cls, edges=int(r['count']), synapses=int(r['sum'])) for _, r in mat.iterrows()],
}
json.dump(summary, open(f'data/derived/mb_summary_{SIDE}.json', 'w'), indent=1)
# weight threshold stats
for th in [1, 2, 3, 5, 10]:
    e = edges[edges.weight >= th]
    print(f'weight>={th:2d}: edges {len(e):8d}  synapses {e.weight.sum():9d}')

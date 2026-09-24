"""Pack the mushroom body circuit into a compact binary for the browser.

Output: public/data/mb_<SIDE>.bin + public/data/mb_<SIDE>.json (layout + lookup tables).
Layout (all little-endian, concatenated, 4-byte aligned):
  xyz      float32[n*3]   soma position in nm
  cls      uint8[n]       index into meta.classes
  typ      uint16[n]      index into meta.types
  sign     int8[n]        +1 excitatory, -1 inhibitory, 0 modulatory/unknown
  indptr   uint32[n+1]    CSR row pointers (outgoing edges, pre -> post)
  indices  uint32[m]      post index
  weights  uint16[m]      synapse count
"""
import json, sys, numpy as np, pandas as pd, os

SIDE = sys.argv[1] if len(sys.argv) > 1 else 'R'
MIN_W = int(sys.argv[2]) if len(sys.argv) > 2 else 3
nodes = pd.read_feather(f'data/derived/mb_nodes_{SIDE}.feather')
edges = pd.read_feather(f'data/derived/mb_edges_{SIDE}.feather')
edges = edges[edges.weight >= MIN_W]

order = {'ALPN': 0, 'Kenyon_Cell': 1, 'MBON': 2, 'DAN': 3, 'APL': 4, 'DPM': 5}
nodes['ord'] = nodes['cls'].map(order)
nodes = nodes.sort_values(['ord', 'type', 'bodyId']).reset_index(drop=True)
n = len(nodes)
idx = pd.Series(np.arange(n), index=nodes['bodyId'])

classes = list(order.keys())
types = sorted(nodes['type'].fillna('?').unique().tolist())
tidx = {t: i for i, t in enumerate(types)}
SIGN = {'acetylcholine': 1, 'gaba': -1, 'glutamate': -1}
xyz = np.array([np.array(p, dtype=np.float32) * 8.0 if p is not None else [np.nan]*3 for p in nodes['somaLocation']], dtype=np.float32)
cls = nodes['cls'].map(order).to_numpy(np.uint8)
typ = nodes['type'].fillna('?').map(tidx).to_numpy(np.uint16)
sign = nodes['nt'].fillna('').str.lower().map(SIGN).fillna(0).to_numpy(np.int8)

pre = idx[edges.body_pre].to_numpy(); post = idx[edges.body_post].to_numpy(); w = edges.weight.to_numpy()
o = np.lexsort((post, pre)); pre, post, w = pre[o], post[o], w[o]
indptr = np.zeros(n + 1, np.uint32); np.add.at(indptr, pre + 1, 1); indptr = np.cumsum(indptr).astype(np.uint32)
indices = post.astype(np.uint32); weights = np.clip(w, 0, 65535).astype(np.uint16)

parts = [('xyz', xyz), ('cls', cls), ('typ', typ), ('sign', sign), ('indptr', indptr), ('indices', indices), ('weights', weights)]
buf = bytearray(); layout = {}
for name, arr in parts:
    while len(buf) % 4: buf += b'\0'
    layout[name] = {'offset': len(buf), 'length': int(arr.size), 'dtype': str(arr.dtype)}
    buf += arr.tobytes()
os.makedirs('public/data', exist_ok=True)
open(f'public/data/mb_{SIDE}.bin', 'wb').write(buf)
meta = {
    'side': SIDE, 'min_weight': MIN_W, 'n': n, 'm': int(len(indices)), 'classes': classes, 'types': types,
    'class_ranges': {c: [int(np.searchsorted(cls, order[c])), int(np.searchsorted(cls, order[c], side='right'))] for c in classes},
    'bodyIds': nodes['bodyId'].tolist(), 'layout': layout,
    'nt_counts': nodes.groupby(['cls', 'nt']).size().reset_index().apply(lambda r: f'{r.cls}:{r.nt}={r[0]}', axis=1).tolist(),
}
json.dump(meta, open(f'public/data/mb_{SIDE}.json', 'w'))
print(f'n={n} m={len(indices)} bin={len(buf)/1e6:.1f}MB json={os.path.getsize(f"public/data/mb_{SIDE}.json")/1e6:.2f}MB')
print(meta['class_ranges']); print('\n'.join(meta['nt_counts']))
print('nan soma:', int(np.isnan(xyz[:,0]).sum()))

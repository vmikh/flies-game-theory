"""Simplify SWC skeletons of the MB circuit and pack them for three.js.

Output public/data/skel_R.bin:
  segOff  uint32[n+1]   segment offsets per neuron (in segments), neuron order = mb_R.json bodyIds
  xyz     float32[nseg*6]  segment endpoints (nm), centred on the circuit centroid
and public/data/skel_R.json with layout + bbox.
Simplification: keep branch points and tips; along unbranched chains keep a node every STEP nm.
"""
import json, os, sys, numpy as np
SIDE = 'R'; STEP = float(sys.argv[1]) if len(sys.argv) > 1 else 4000.0   # nm between kept nodes
KC_FRAC = float(sys.argv[2]) if len(sys.argv) > 2 else 0.3   # fraction of Kenyon cells drawn (they dominate the count)
VOX = 8.0
meta = json.load(open(f'public/data/mb_{SIDE}.json')); ids = meta['bodyIds']
kc0, kc1 = meta['class_ranges']['Kenyon_Cell']; rng = np.random.default_rng(0)
drawn = np.ones(len(ids), bool); drawn[kc0:kc1] = rng.random(kc1 - kc0) < KC_FRAC
segs_all = []; offs = [0]; missing = 0; nodes_in = 0
for ni, bid in enumerate(ids):
    path = f'data/raw/swc/{bid}.swc'
    if not drawn[ni] or not os.path.exists(path): missing += (not os.path.exists(path)); offs.append(offs[-1]); continue
    rows = [l.split() for l in open(path) if l.strip() and not l.startswith('#')]
    if not rows: offs.append(offs[-1]); continue
    nid = np.array([int(r[0]) for r in rows]); xyz = np.array([[float(r[2]), float(r[3]), float(r[4])] for r in rows], np.float32) * VOX; par = np.array([int(r[6]) for r in rows])
    nodes_in += len(rows)
    idx = {v: i for i, v in enumerate(nid)}; parent = np.array([idx.get(p, -1) for p in par])
    nchild = np.zeros(len(nid), int); 
    for p in parent:
        if p >= 0: nchild[p] += 1
    keep = (nchild != 1) | (parent < 0)   # branch points, tips, roots
    # walk from each kept node up to the next kept node, keeping nodes every STEP along the way
    out = []
    for i in np.where(keep)[0]:
        last = xyz[i]; acc = 0.0; j = parent[i]; prev = i
        while j >= 0:
            acc += float(np.linalg.norm(xyz[j] - xyz[prev]))
            if keep[j]: out.append((last, xyz[j])); break
            if acc >= STEP: out.append((last, xyz[j])); last = xyz[j]; acc = 0.0
            prev = j; j = parent[j]
    segs_all.extend(out); offs.append(len(segs_all))
segs = np.array(segs_all, np.float32).reshape(-1, 6)
# centre on the Kenyon cells (calyx + lobes = the visual mass), not on the long PN/MBON axons
kc_segs = np.concatenate([segs[offs[i]:offs[i+1]] for i in range(kc0, kc1) if offs[i+1] > offs[i]])
centre = kc_segs.reshape(-1, 3).mean(0); segs -= np.tile(centre, 2)
bbox = [segs.reshape(-1, 3).min(0).tolist(), segs.reshape(-1, 3).max(0).tolist()]
offs = np.array(offs, np.uint32)
buf = bytearray(); layout = {}
for name, arr in [('segOff', offs), ('xyz', segs.ravel())]:
    while len(buf) % 4: buf += b'\0'
    layout[name] = {'offset': len(buf), 'length': int(arr.size), 'dtype': str(arr.dtype)}; buf += arr.tobytes()
open(f'public/data/skel_{SIDE}.bin', 'wb').write(buf)
json.dump({'n': len(ids), 'nseg': int(len(segs)), 'step_nm': STEP, 'kc_frac': KC_FRAC, 'centre': centre.tolist(), 'bbox': bbox, 'layout': layout}, open(f'public/data/skel_{SIDE}.json', 'w'))
print(f'neurons {len(ids)} missing {missing}  swc nodes {nodes_in}  segments {len(segs)}  bin {len(buf)/1e6:.1f} MB  bbox {np.round(np.array(bbox[1])-np.array(bbox[0]))}')

# flies-game-theory

Nine simulated fruit-fly brains play an iterated prisoner's dilemma against each other.
Each "fly" is the mushroom body circuit of the real *Drosophila* connectome
([Male CNS v1.0](https://male-cns.janelia.org/), HHMI Janelia / Google Research, CC-BY 4.0)
simulated as leaky integrate-and-fire neurons with dopamine-gated plasticity.
Opponents are presented as odors; payoffs drive reward (PAM) or punishment (PPL1) dopamine neurons;
the fly's memory is literally its Kenyon cell → MBON synaptic weights.

Static site, no backend.

## Layout

- `scripts/extract_mb.py` – pull the right-hemisphere mushroom body (PN, KC, MBON, DAN, APL, DPM) out of the 1.1 GB connectome.
- `scripts/export_web.py` – pack it into `public/data/mb_R.{bin,json}` (~0.8 MB).
- `scripts/proto_lif.py`, `scripts/calib.py` – Python prototypes of the simulator used to calibrate parameters.
- `src/` – the web app (Vite + TypeScript, three.js, d3).

## Data

Raw connectome tables are not committed; download them with:

```
mkdir -p data/raw && cd data/raw
B=https://storage.googleapis.com/flyem-male-cns/v1.0/connectome-data/flat-connectome
curl -O $B/body-annotations-male-cns-v1.0-minconf-0.5.feather
curl -O $B/body-neurotransmitters-male-cns-v1.0.feather
curl -O $B/connectome-weights-male-cns-v1.0-minconf-0.5.feather   # 1.1 GB
```

Then `python scripts/extract_mb.py R && python scripts/export_web.py R 3`.

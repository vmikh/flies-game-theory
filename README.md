# flies-game-theory

Eight simulated fruit-fly brains play an iterated prisoner's dilemma against each other.
Each "fly" is the mushroom body circuit of the real *Drosophila* connectome
([Male CNS v1.0](https://male-cns.janelia.org/), HHMI Janelia / Google Research, CC-BY 4.0)
simulated as leaky integrate-and-fire neurons with dopamine-gated plasticity.
Opponents are presented as odors; payoffs drive reward (PAM) or punishment (PPL1) dopamine neurons;
the fly's memory is literally its Kenyon cell → MBON synaptic weights.

Static site, no backend. Eight flies, each in its own Web Worker; the arena renders the real EM skeletons with three.js.
At viewport widths below 1350 px, the site shows the project description and one rotatable connectome brain instead of running the game. The coloured waves there are illustrative signals through the circuit, not recorded gameplay.

## Run

```
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
```

Headless checks (Node 24): `node --experimental-transform-types scripts/run_game.ts 40`,
`scripts/control.ts` (shuffled-wiring control), `scripts/lesion_test.ts noPPL1`, `scripts/smoke.ts` (headless Chrome).

## Interpreting an experiment

- The UI draws a new random seed on every restart. For reproducible comparisons, use the hidden `?advanced` controls or the headless audit script with explicit seeds. A shared seed fixes the initial odour assignment and random streams, but learning changes later stream consumption, so it is not a perfectly paired counterfactual. Repeat each comparison over several seeds. `node --experimental-transform-types scripts/audit_experiment.ts 30 3` prints outcomes for three seeds per condition.
- The status percentage counts all decisions since the start. The plot counts the last 200 decisions. After bankruptcy, only surviving flies make new decisions, so the observed rate also reflects selection and changing pairings. For a fixed cohort over a finite run, set ante to zero via `?advanced` with the standard nonnegative payoffs.
- Each fly learns from its own *payoff*, while bystanders learn from the *observed action*. With eight active flies, each watches six actions per round but plays once. `observeGain = 1` applies to each watched action; it does not match one round of direct experience.
- `trustBias` shifts the decision probability on **every** game, including rematches. A negative setting changes more than the first meeting and can compound losses from the ante.
- At `forgetPerRound = 0`, KC→MBON plastic factors can only decrease, down to `plasticMin = 0.05`. Repeated positive and negative signals can depress both readout pathways and return the decision score toward zero. A rate near 50% can therefore reflect saturation, rather than absence of learning.
- The connectome supplies circuit structure and synapse counts, not a measured prisoner's-dilemma policy. Payoff-to-dopamine mapping, social learning, the MBON readout, and bankruptcy are model assumptions. The default 5/3/1/0 payoffs with ante 2 make mutual defection lose one point per fly per game; early distrust can lead to elimination.
- The class-shuffled circuit is an approximate wiring control: it preserves source neurons, synapse counts per sampled edge and target classes, but redraws targets with replacement. Exact target degrees and the number of distinct edges can change.

## Deploy

Vercel: import the GitHub repo, framework preset "Vite" (`vercel.json` sets the build and caching).
`public/data/` holds the packed circuit (0.8 MB) and skeletons (11 MB, ~3.4 MB compressed); both are committed.

## Analytics

PostHog is optional until a project token is configured. Copy `.env.example` to `.env.local` for local development, or set `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST` in Vercel and redeploy. Use the project token and matching ingestion host from PostHog Project settings (US or EU). The token is public by design; do not use a personal API key. Without a token, the analytics module makes no requests. The app sends pageviews, page exits, click autocapture, and named events for simulation controls, focus, language, and completion. Session recording is disabled.

## Layout

- `scripts/extract_mb.py` – pull the right-hemisphere mushroom body (PN, KC, MBON, DAN, APL, DPM) out of the 1.1 GB connectome.
- `scripts/export_web.py` – pack it into `public/data/mb_R.{bin,json}` (~0.8 MB).
- `scripts/proto_lif.py`, `scripts/calib.py` – Python prototypes of the simulator used to calibrate parameters.
- `scripts/pack_skeletons.py` – simplify the SWC skeletons into `public/data/skel_R.{bin,json}`.
- `src/sim.ts` LIF simulator · `src/game.ts` the iterated prisoner's dilemma · `src/backend.ts`, `src/fly.worker.ts` brains in workers · `src/arena.ts` three.js view · `src/main.ts` UI.

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

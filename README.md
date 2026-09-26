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

## Hidden setting: shuffled-wiring control

The site always runs the real connectome. Visitors cannot change the wiring: the switch is in the advanced panel, which appears only when `?advanced` is added to the URL (Parameters → Advanced → Wiring → "shuffled (control)"). While it is active, the status line says "shuffled wiring".

What it is for: a check of whether the specific wiring of the real mushroom body matters, or whether any circuit with the same neuron classes would behave the same. Run the same seeds with the real and the shuffled wiring and compare learning and cooperation.

How the shuffle works: an approximate control. It keeps every neuron, each edge's source neuron, synapse count and target class, but redraws targets with replacement. Exact target degrees and the number of distinct edges can change. All flies in one game get the same shuffled circuit, drawn from the game seed.

Known limitation: only the brains get the shuffled circuit. The game still labels each MBON as approach or avoid from the dopamine wiring of the real connectome. The shuffle also redraws DAN → MBON edges, so in the shuffled brain dopamine reaches different MBONs than the labels assume. On seeds 1–5, 13–18 of the 36 labelled MBONs change sign and 2–7 lose their label. A worse result with shuffled wiring therefore mixes two causes: different wiring, and a readout that no longer matches where learning happens. Do not read it as proof that the real wiring is special.

## Deploy

Vercel: import the GitHub repo, framework preset "Vite" (`vercel.json` sets the build and caching).
`public/data/` holds the packed circuit (0.8 MB) and skeletons (11 MB, ~3.4 MB compressed); both are committed.
`public/audio/` holds the two podcast episodes (English and Russian, 64 kbps mono MP3, ~20 MB together). The player in the bottom-right corner of the arena picks the episode that matches the site language.

## Analytics

PostHog is optional until a project token is configured. Copy `.env.example` to `.env.local` for local development, or set `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST` in Vercel and redeploy. Use the project token and matching ingestion host from PostHog Project settings (US or EU). The token is public by design; do not use a personal API key. Without a token, the analytics module makes no requests. The app sends pageviews, page exits, click autocapture, and named events for simulation controls, focus, language, podcast playback, experiment results, and completion. Session recording is disabled.

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

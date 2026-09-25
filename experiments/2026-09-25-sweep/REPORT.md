# Parameter sweep: flies and the prisoner's dilemma

25 September 2026. 1,400 games: 14 settings × 100 seeds × 35 rounds.

## In 30 seconds

**What pays for one fly, and what pays for the world**

**The world does best when everyone cooperates.** Wealth rises with cooperation, from 22 coins per fly in the wary worlds to 57.5 in the trusting one. The friendly world set the record with 648 coins across eight flies.
*Supported by: trust +0.5, friendly world, trust −0.5, hostile world.*

**A single fly does best by defecting, as long as nobody remembers.** Where memory is weak, the more a fly defects, the richer it ends. That holds without learning, at the default settings and with strong gossip. The harsh preset makes it stronger. A fly that always cooperates loses 6.6 coins against the average there, 4.3 at the defaults. The mutant tournament was won by the fly that defects most.
*Supported by: no dopamine, default, strong gossip, harsh world, mutant tournament.*

**But when flies remember grudges, strict tit-for-tat pays best.** Without gossip, strict tit-for-tat ends 4 to 8 coins above the average, and defecting no longer pays.
*Supported by: no gossip, pure memory.*

**Bottom line.** Memory turns cooperation from a sacrifice into a winning strategy.

## How it was run

- **Engine.** The same model as the site (`src/game.ts`, `src/sim.ts`), run headless in Node (`LocalFly`), 8 processes in parallel.
- **Size.** 14 settings × 100 seeds (1–100) × 35 rounds. 35 rounds are 5 full round-robins, so every pair of flies meets 5 times.
- **Same seeds in every set.** Comparisons are paired: same odours, same random draws, only the setting differs.
- **Control.** All 8 flies without dopamine, so no learning.
- **Mutant tournament.** Mutant slots are shuffled on every seed, so pairing order and odours are not tied to a mutation.
- **Shuffled wiring was not run.** It has a known readout problem, see the README section "Hidden setting".

**Time.** About 7 hours 45 minutes of wall-clock time on 25 September. The 1,400 games add up to 53.6 hours of run time. A game took 2.3 minutes on average under load, about 35 seconds on its own. The pilot and a discarded first launch (about 20 minutes) are not counted.

### Settings

Unless noted, everything is at the defaults: gossip 0.1, forgetting 0.05, trust 0, payoffs 5/3/1/0, ante 2, starting money 30.

| Set | File | Change |
|---|---|---|
| Control | `nullNoDAN` | all 8 flies without dopamine |
| Default | `default` | none |
| No gossip | `gossip0` | gossip 0 |
| Strong gossip | `gossip1` | gossip 1 |
| No forgetting | `forget0` | forgetting 0 |
| Fast forgetting | `forget02` | forgetting 0.2 |
| Trusting | `trustPlus` | trust +0.5 |
| Wary | `trustMinus` | trust −0.5 |
| Generous world | `generous` | payoffs 5/4/1/0 |
| Harsh world | `harsh` | payoffs 6/3/1/−1 |
| Pure memory | `pureMemory` | forgetting 0 + gossip 0 |
| Friendly world | `friendlyWorld` | 5/4/1/0 + trust +0.5 |
| Hostile world | `hostileWorld` | 6/3/1/−1 + trust −0.5 |
| Mutant tournament | `tournament` | 3 intact flies + no PPL1, no PAM, no dopamine, half KCs, no APL |

**Responsiveness** is the main measure of learning in this report. It is how many percentage points more often a fly cooperates with an opponent who cooperated with it last time than with one who defected. At 0, the fly does not remember how anyone treated it.

## How clean is the experiment

**Strengths**
- The same 100 seeds in every set, so comparisons are paired.
- Results are reproducible: the same seed gives the same game.
- The control is clean: 50.5% cooperation and −0.4 pp responsiveness, which is zero.
- Mutant slots in the tournament are random.

**Limitations**
1. **Tit-for-tat is built into the rules.** The sign of dopamine always matches the opponent's move. T and R (the opponent cooperated) are rewarded, S and P (the opponent defected) are punished. A fly learns whether an opponent is good or bad for it, not whether defecting pays. It cannot learn to exploit others.
2. **Learning itself pushes flies towards cooperation, to about 57%.** This holds in every set with learning, while the control stays at 50%. It looks like a property of the model rather than a choice by the flies.
3. **The trust knob outweighs the brain.** It moves cooperation by ±25 pp. Learning changes behaviour by 3 to 23 pp.
4. **The brain barely feels the payoffs.** The dopamine signal is scaled by T and R and clipped at ±1, so many payoff matrices send the brain the same signals. The harsh preset is chosen so that the brain does tell it apart: the reward for mutual cooperation drops to 0.5 from 0.6, and 31 of 100 games diverge from the defaults. Average behaviour still does not move, just as in the generous world. Payoffs change who ends up with the money, not how the flies play.
5. **Strategy labels are unreliable.** A third of the flies without learning still get a meaningful label, and 14% of them are called forgiving tit-for-tat.
6. **35 rounds, while the site runs forever.** Without forgetting, 12% of synapses already sit at the minimum, and that share will grow.
7. **Bankruptcies barely distort the percentages.** They matter only in the hostile world and come late, around round 30.
8. **The role of the real connectome is untested.** Every conclusion is about this model on this connectome.
9. **Gossip is asymmetric:** +0.6 for cooperation, −1 for defection.

## Results by set

### 1. Control: all flies without dopamine
**Without learning, a fly is a fair coin: 50.5% cooperation, zero responsiveness. Everything else is compared with this.**

Only neural noise drives the choices. A third of the flies still get a strategy label, such as forgiving tit-for-tat (14%) or defector (5%). That is chance, not character. Flies that defected more end richer (correlation −0.49): without memory, nobody can punish defection.

### 2. Default
**The default settings show learning at its weakest: responsiveness is only 3.5 pp.**

Cooperation is 57.4%. After the opponent cooperated, a fly cooperates 59.6% of the time, after a defection 55.6%. The gap is statistically real (t ≈ 3.9 against the control) but hard to see. Defectors end richer (−0.32), and almost half the flies are labelled unstable.

### 3. No gossip
**The clearest sign of learning: responsiveness of 22.6 pp, six times the default.**

After the opponent cooperated, a fly cooperates 68% of the time, after a defection 45%. Its attitude to an opponent closely tracks how that opponent treated it (correlation 0.56, against 0.16 at the defaults). Cooperation grows from 51% in the first round-robin to 59% in the fifth. Cooperating stops costing money (correlation with wealth ≈ 0), and the richest flies are mostly tit-for-tat and forgiving tit-for-tat.

### 4. Strong gossip
**Strong gossip wipes out personal memory: responsiveness is 0.3 pp, as in flies without a brain.**

A fly watches 6 moves by others each round and makes only 1 of its own. No reputation forms either: everyone cooperates about 57% of the time, so there is nothing to tell good flies from bad ones. Memory is the most worn here, with a mean synapse weight of 0.72.

### 5. No forgetting
**Turning forgetting off changes almost nothing, because gossip dominates.**

Cooperation is 57.6%, responsiveness 3.0 pp. Attitudes track opponents slightly better (0.20 against 0.16). But 12% of synapses already sit at the minimum, so memory starts to clog.

### 6. Fast forgetting
**By the next meeting a fly keeps only about 20% of its memory of an opponent, and its attitude barely tracks the opponent's behaviour.**

Pairs meet every 7 rounds, and 0.8⁷ ≈ 0.21. Responsiveness is 2.3 pp, tracking 0.06. Cooperation stays at 58%.

### 7. Trusting flies (+0.5)
**One knob lifts cooperation from 57% to 82%, while learning stays the same.**

Responsiveness is 3.9 pp, as at the defaults. Total wealth is 460 against 351. 88% of flies are labelled always cooperates. Even here, flies that defect more end richer (−0.32).

### 8. Wary flies (−0.5)
**Wariness drops cooperation to 28% and halves total wealth.**

Wealth is 177 against 351, and in 20% of games at least one fly goes bankrupt. 65% of flies are defectors, and the richest fly is almost always a defector (72 of 100).

### 9. Generous world (5/4/1/0)
**The flies did not notice the generous world: behaviour matches the defaults, only the wallets grew.**

Cooperation is 57.5%, responsiveness 3.7 pp. 46 of 100 games match the defaults round for round. Wealth is 443 against 351, and cooperation costs less (−0.18 against −0.32).

### 10. Harsh world (6/3/1/−1)
**Even when the brain feels the harsh world, flies play as usual: cooperation 57.4%, responsiveness 3.2 pp. Only who gets rich changes.**

The reward for mutual cooperation is weaker here, 0.5 instead of 0.6. 31 of 100 games diverge from the defaults, but average behaviour is the same. Total wealth is unchanged too, 350 against 351, because a pair earns the same total per game as with the classic payoffs. Money moves from trusting flies to defectors. A fly that always cooperates loses 6.6 coins against the average (4.3 at the defaults). The link between cooperating more and ending poorer is stronger: −0.40 against −0.32. Bankruptcies are rare, 3 in 100 games.

### 11. Pure memory (no forgetting, no gossip)
**Without forgetting, a fly still responds well (18 pp), but less than with light forgetting (22.6 pp).**

Without forgetting, synapse weights can only fall, and 9.5% of them end at the minimum. Light forgetting keeps memory fresh. The gap between 18 and 22.6 is statistically reliable.

### 12. Friendly world (generous payoffs + trust)
**Behaviour matches the trusting flies (82%), and wealth hits the record, 648. The effects add up without reinforcing each other.**

Generous payoffs only multiply what cooperation earns. Defectors are barely richer (−0.09).

### 13. Hostile world (6/3/1/−1 + wariness)
**The most conflict-ridden setting: 28% cooperation, a bankruptcy in 53% of games, half the default wealth.**

Behaviourally these are just wary flies: 47 of 100 games match round for round, and total wealth is the same, 178 against 177. The difference is who pays. Being the sucker costs 3 coins per game, so the few trusting flies go broke. There are 60 bankruptcies in 100 games, around round 30. Wary flies with classic payoffs go bankrupt in only 20% of games. The richest fly is almost always a defector (74 of 100).

### 14. Mutant tournament
**The fly without reward dopamine (PAM) wins: it defects more and is the richest fly in 48% of games.**

| Fly | Cooperates | Money | Mean rank | First place | Responsiveness |
|---|---|---|---|---|---|
| no PAM (no reward) | 35% | 56 | 2.3 | 48% | −1.3 pp |
| no dopamine | 50% | 47 | 3.7 | 15% | −0.6 pp |
| half KCs | 54% | 46 | 4.1 | 14% | 4.3 pp |
| intact | 57% | 43 | 4.6 | 7% | 5.3 pp |
| no APL | 68% | 37 | 5.6 | 1% | 0.8 pp |
| no PPL1 (no punishment) | 77% | 32 | 6.5 | 0% | 1.1 pp |

The winner is decided by how readily a fly cooperates, not by how smart it is: the less a fly cooperates, the richer it ends (−0.62). A fly without PAM only gets punishment, so it defects. A fly without PPL1 only gets reward, turns naive and gets exploited.

## What pays for one fly, and what pays for the world

Average wealth per fly (start: 30):

| World | Cooperation | Coins per fly |
|---|---|---|
| friendly | 82% | 81.0 |
| trusting | 82% | 57.5 |
| default | 57% | 43.9 |
| no gossip | 57% | 43.3 |
| hostile | 28% | 22.2 |
| wary | 28% | 22.1 |

How much richer or poorer than the game average a fly with each label ends:

| World | defector | tit-for-tat | forgiving tit-for-tat | always cooperates |
|---|---|---|---|---|
| control | **+6.7** | – | −5.5 | −8.6 |
| mutant tournament | **+14.8** | – | −3.3 | −8.5 |
| default | – | **+7.7** (n=21) | −0.6 | −4.3 |
| harsh | – | **+7.6** (n=20) | −1.5 | −6.6 |
| no gossip | – | **+3.9** | −1.0 | −1.9 |
| pure memory | – | **+5.5** | −0.9 | −2.2 |
| wary | **+1.6** | −4.8 | – | – |
| hostile | **+2.7** | −5.3 | – | – |

A dash means fewer than 20 such flies. Labels are noisy (limitation 5), so read these as trends, not precise estimates.

## Reproducing

From the repository root:

```
node --experimental-transform-types experiments/2026-09-25-sweep/run.ts default 1 100 35 /tmp/default.jsonl
node experiments/2026-09-25-sweep/analyze.mjs                    # summary of data/
node experiments/2026-09-25-sweep/analyze.mjs <folder of .jsonl> # summary of another folder
```

Set names are in `CFGS` in `run.ts`. Each line of a `.jsonl` file is one game: totals, cooperation per round, strategy counters and each fly's money.

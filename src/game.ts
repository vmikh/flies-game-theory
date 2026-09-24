/**
 * Iterated prisoner's dilemma between N mushroom-body flies.
 * Opponents are odours; payoffs drive PAM (reward) / PPL1 (punishment) dopamine neurons;
 * observers see each game and receive a weaker dopamine signal about each player's action.
 */
import type { Circuit } from './circuit.ts';
import { MBSim, DEFAULT_PARAMS, mulberry32, type SimParams } from './sim.ts';

export interface GameParams {
  nFlies: number;
  glomPerOdor: number;        // glomeruli per identity odour (disjoint sets)
  decisionMs: number;         // odour presentation used to read the decision
  learnMs: number;            // odour + dopamine presentation after payoff
  observeMs: number;          // observers' presentation per player
  observeGain: number;        // dopamine rate multiplier for observers (0 = no social learning)
  temperature: number;        // softmax temperature on (score - baseline)
  trustBias: number;          // added to score before sigmoid; >0 = trusting by default
  payoff: { T: number; R: number; P: number; S: number };
  ante: number;               // paid by both players each game
  startMoney: number;
  baselineReps: number;
  responsiveMin: number;      // MBON counts in the naive readout below this are ignored (spikes per decision window)
  minDanInput: number;        // MBONs with less DAN input (synapses) get no valence
  forgetPerRound: number;     // plastic factors relax toward 1 by this fraction each round
  sim: SimParams;
  seed: number;
}

export const DEFAULT_GAME: GameParams = {
  nFlies: 9, glomPerOdor: 7, decisionMs: 600, learnMs: 400, observeMs: 300, observeGain: 0.1,
  temperature: 0.5, trustBias: 0, payoff: { T: 5, R: 3, P: 1, S: 0 }, ante: 2, startMoney: 30, baselineReps: 6, responsiveMin: 3, minDanInput: 20, forgetPerRound: 0.05,
  sim: DEFAULT_PARAMS, seed: 1,
};

export interface Fly {
  id: number; name: string; sim: MBSim; money: number; alive: boolean; lineage: number; born: number;
  baseline: Float32Array;   // kept at 0 (score is defined relative to the naive response)
  base: Float32Array;       // naive mean spike count per MBON per opponent odour: [opp * nMbon + j]
  trust: Float32Array;      // last decision score (baseline-subtracted) per opponent
  games: number; coops: number; defects: number; betrayed: number;
}

export interface GameRecord {
  round: number; a: number; b: number; ca: boolean; cb: boolean; pa: number; pb: number; scoreA: number; scoreB: number; pcA: number; pcB: number;
}

export interface Snapshot {
  round: number; games: number; coopRate: number; recentCoopRate: number;
  flies: { id: number; name: string; money: number; alive: boolean; lineage: number; games: number; coops: number; defects: number; betrayed: number }[];
  trust: number[][]; baseline: number[][];
  last: GameRecord[];
}

export class Game {
  flies: Fly[] = []; odors: number[][] = []; round = 0; gamesPlayed = 0; coopTotal = 0; recent: boolean[] = [];
  PAM: number[]; PPL1: number[]; approach: number[]; avoid: number[];
  mbon: number[]; valence: Int8Array;   // per MBON: +1 PPL1-compartment (approach when active), −1 PAM-compartment (avoid), 0 unassigned
  get nMbon() { return this.mbon.length; }
  log: GameRecord[] = [];
  private rng: () => number;
  onProgress?: (msg: string) => void;

  constructor(readonly c: Circuit, readonly p: GameParams = DEFAULT_GAME) {
    this.rng = mulberry32(p.seed);
    this.PAM = c.idsByPrefix('DAN', 'PAM'); this.PPL1 = c.idsByPrefix('DAN', 'PPL1');
    const mbon = c.ids('MBON'); this.mbon = mbon; const m0 = c.range('MBON')[0];
    // compartment valence from the connectome: which dopamine population innervates each MBON
    const pam = new Float32Array(mbon.length), ppl1 = new Float32Array(mbon.length);
    for (const d of c.ids('DAN')) for (let k = c.indptr[d]; k < c.indptr[d + 1]; k++) { const j = c.indices[k] - m0; if (j < 0 || j >= mbon.length) continue;
      if (c.typeName[d].startsWith('PAM')) pam[j] += c.weights[k]; else if (c.typeName[d].startsWith('PPL1')) ppl1[j] += c.weights[k]; }
    this.valence = Int8Array.from(mbon, (_, j) => (pam[j] + ppl1[j] < p.minDanInput ? 0 : ppl1[j] > pam[j] ? 1 : -1));
    this.approach = mbon.filter((_, j) => this.valence[j] > 0); this.avoid = mbon.filter((_, j) => this.valence[j] < 0);
    this.odors = this.makeOdors(p.nFlies, p.glomPerOdor);
    for (let i = 0; i < p.nFlies; i++) this.flies.push(this.newFly(i, i, 0));
  }

  private makeOdors(n: number, k: number): number[][] {
    const c = this.c;
    const pn = c.ids('ALPN').filter((i) => c.sign[i] > 0 && c.typeName[i].includes('_') && !c.typeName[i].startsWith('M_'));
    const glom = new Map<string, number[]>();
    for (const i of pn) { const g = c.typeName[i].split('_')[0]; (glom.get(g) ?? glom.set(g, []).get(g)!).push(i); }
    const names = [...glom.keys()].sort().map((g) => [g, this.rng()] as const).sort((a, b) => a[1] - b[1]).map(([g]) => g);
    if (n * k > names.length) throw new Error(`need ${n * k} glomeruli, have ${names.length}`);
    return Array.from({ length: n }, (_, i) => names.slice(i * k, (i + 1) * k).flatMap((g) => glom.get(g)!).sort((a, b) => a - b));
  }

  private newFly(id: number, lineage: number, born: number, cloneOf?: Fly): Fly {
    const sim = new MBSim(this.c, this.p.sim, this.p.seed * 1000 + id * 17 + born);
    if (cloneOf) { sim.plastic.set(cloneOf.sim.plastic); for (let e = 0; e < sim.plastic.length; e++) sim.plastic[e] = Math.min(1, Math.max(this.p.sim.plasticMin, sim.plastic[e] * (0.9 + 0.2 * this.rng()))); }
    const f: Fly = { id, name: `F${id + 1}`, sim, money: this.p.startMoney, alive: true, lineage, born,
      baseline: new Float32Array(this.p.nFlies), trust: new Float32Array(this.p.nFlies), base: new Float32Array(this.p.nFlies * this.nMbon), games: 0, coops: 0, defects: 0, betrayed: 0 };
    if (cloneOf) {   // inherit the parent's calibration (its memory is copied, so its baselines still apply); own odour is new
      f.base.set(cloneOf.base); f.trust.set(cloneOf.trust);
      f.trust[id] = 0; f.baseline[id] = 0;
      if (cloneOf.id !== id) { this.calibrate(f, cloneOf.id); f.trust[cloneOf.id] = 0; }
      return f;
    }
    for (let o = 0; o < this.p.nFlies; o++) if (o !== id) this.calibrate(f, o);
    return f;
  }

  /** Present opponent odour for the decision window; returns per-MBON spike counts. */
  counts(f: Fly, opp: number): Float32Array {
    const sim = f.sim; sim.resetState(); const od = this.odors[opp];
    for (let t = 0; t < this.p.decisionMs; t++) sim.step(od, null, false);
    return Float32Array.from(this.mbon, (i) => sim.rateCount[i]);
  }
  /** Naive response to an opponent odour, averaged over baselineReps presentations. */
  calibrate(f: Fly, opp: number) {
    const n = this.nMbon, o = opp * n; f.base.fill(0, o, o + n);
    for (let r = 0; r < this.p.baselineReps; r++) { const c = this.counts(f, opp); for (let j = 0; j < n; j++) f.base[o + j] += c[j] / this.p.baselineReps; }
    f.baseline[opp] = 0;
  }
  /**
   * Score ≈ [-1, 1]: mean relative change of responsive approach MBONs minus that of responsive avoid MBONs.
   * 0 when naive; −1 when the approach pathway for this odour is fully silenced; +1 when the avoid pathway is.
   */
  toScore(f: Fly, opp: number, c: Float32Array): number {
    const n = this.nMbon, o = opp * n; let ap = 0, nap = 0, av = 0, nav = 0;
    for (let j = 0; j < n; j++) { const b = f.base[o + j]; if (b < this.p.responsiveMin || this.valence[j] === 0) continue;
      const rel = (c[j] - b) / b; if (this.valence[j] > 0) { ap += rel; nap++; } else { av += rel; nav++; } }
    return (nap ? ap / nap : 0) - (nav ? av / nav : 0);
  }
  score(f: Fly, opp: number): number { return this.toScore(f, opp, this.counts(f, opp)); }

  decide(f: Fly, opp: number): { coop: boolean; score: number; pc: number } {
    const s = this.score(f, opp) - f.baseline[opp]; f.trust[opp] = s;
    const pc = 1 / (1 + Math.exp(-(s + this.p.trustBias) / this.p.temperature));
    return { coop: this.rng() < pc, score: s, pc };
  }

  /** Present odour with dopamine. valence>0 → PAM at rate ∝ valence, <0 → PPL1. */
  teach(f: Fly, opp: number, valence: number, ms: number, gain = 1) {
    if (valence === 0) return; const sim = f.sim; sim.resetState(); const od = this.odors[opp];
    const dan = valence > 0 ? this.PAM : this.PPL1; const rate0 = sim.p.danRate; (sim.p as SimParams).danRate = rate0 * Math.min(1, Math.abs(valence)) * gain;
    for (let t = 0; t < ms; t++) sim.step(od, t > 40 ? dan : null, true);
    (sim.p as SimParams).danRate = rate0;
  }

  payoffValence(pay: number): number {   // map payoff to dopamine valence in [-1, 1]
    const { T, R, P } = this.p.payoff;
    return pay >= R ? pay / T : -(R - pay) / R;
  }

  playGame(ia: number, ib: number) {
    const A = this.flies[ia], B = this.flies[ib]; const { T, R, P, S } = this.p.payoff;
    const da = this.decide(A, ib), db = this.decide(B, ia);
    const pa = da.coop ? (db.coop ? R : S) : (db.coop ? T : P), pb = db.coop ? (da.coop ? R : S) : (da.coop ? T : P);
    A.money += pa - this.p.ante; B.money += pb - this.p.ante; A.games++; B.games++;
    if (da.coop) A.coops++; else A.defects++; if (db.coop) B.coops++; else B.defects++;
    if (da.coop && !db.coop) A.betrayed++; if (db.coop && !da.coop) B.betrayed++;
    this.teach(A, ib, this.payoffValence(pa), this.p.learnMs); this.teach(B, ia, this.payoffValence(pb), this.p.learnMs);
    if (this.p.observeGain > 0) for (const W of this.flies) if (W.alive && W !== A && W !== B) {
      this.teach(W, ia, da.coop ? 0.6 : -1, this.p.observeMs, this.p.observeGain);
      this.teach(W, ib, db.coop ? 0.6 : -1, this.p.observeMs, this.p.observeGain);
    }
    const rec: GameRecord = { round: this.round, a: ia, b: ib, ca: da.coop, cb: db.coop, pa, pb, scoreA: da.score, scoreB: db.score, pcA: da.pc, pcB: db.pc };
    this.log.push(rec); this.gamesPlayed++; this.coopTotal += (da.coop ? 1 : 0) + (db.coop ? 1 : 0);
    this.recent.push(da.coop, db.coop); if (this.recent.length > 200) this.recent.splice(0, this.recent.length - 200);
    return rec;
  }

  /** Round-robin pairing (circle method) for this round among alive flies; odd count → one fly sits out. */
  pairings(): [number, number][] {
    const ids = this.flies.filter((f) => f.alive).map((f) => f.id); if (ids.length < 2) return [];
    const slots = ids.length % 2 ? [...ids, -1] : ids; const n = slots.length, r = this.round % (n - 1);
    const rest = slots.slice(1); const rot = rest.map((_, i) => rest[(i + r) % rest.length]); const arr = [slots[0], ...rot];
    const pairs: [number, number][] = [];
    for (let i = 0; i < n / 2; i++) { const a = arr[i], b = arr[n - 1 - i]; if (a >= 0 && b >= 0) pairs.push([a, b]); }
    return pairs;
  }

  playRound(): GameRecord[] {
    const recs = this.pairings().map(([a, b]) => this.playGame(a, b));
    // bankruptcy → replaced by a mutated clone of the current leader
    const alive = this.flies.filter((f) => f.alive);
    for (const f of alive) if (f.money <= 0) {
      f.alive = false; const leader = this.flies.filter((g) => g.alive).sort((x, y) => y.money - x.money)[0];
      if (leader) { const nf = this.newFly(f.id, leader.lineage, this.round + 1, leader); this.flies[f.id] = nf; }
    }
    for (const f of this.flies) if (f.alive) f.sim.forget(this.p.forgetPerRound);
    this.round++;
    return recs;
  }

  snapshot(): Snapshot {
    const n = this.p.nFlies;
    return {
      round: this.round, games: this.gamesPlayed, coopRate: this.gamesPlayed ? this.coopTotal / (2 * this.gamesPlayed) : 0,
      recentCoopRate: this.recent.length ? this.recent.filter(Boolean).length / this.recent.length : 0,
      flies: this.flies.map((f) => ({ id: f.id, name: f.name, money: f.money, alive: f.alive, lineage: f.lineage, games: f.games, coops: f.coops, defects: f.defects, betrayed: f.betrayed })),
      trust: this.flies.map((f) => Array.from(f.trust)), baseline: this.flies.map((f) => Array.from(f.baseline)),
      last: this.log.slice(-Math.max(1, n)),
    };
  }
}

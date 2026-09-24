/**
 * Iterated prisoner's dilemma between N mushroom-body flies.
 * Opponents are odours; payoffs drive PAM (reward) / PPL1 (punishment) dopamine neurons;
 * observers see each game and receive a weaker dopamine signal about each player's action.
 * Brains are FlyBackends (in-thread or one Web Worker each); phases run in parallel across flies.
 */
import type { Circuit } from './circuit.ts';
import { DEFAULT_PARAMS, mulberry32, type SimParams } from './sim.ts';
import type { FlyBackend, Frames, DanPop } from './backend.ts';

export interface GameParams {
  nFlies: number;
  glomPerOdor: number;        // glomeruli per identity odour (disjoint sets)
  decisionMs: number;         // odour presentation used to read the decision
  learnMs: number;            // odour + dopamine presentation after payoff
  observeMs: number;          // observers' presentation per player
  observeGain: number;        // dopamine rate multiplier for observers (0 = no social learning)
  temperature: number;        // softmax temperature on score
  trustBias: number;          // added to score before sigmoid; >0 = trusting by default
  payoff: { T: number; R: number; P: number; S: number };
  ante: number;               // paid by both players each game
  startMoney: number;
  baselineReps: number;
  responsiveMin: number;      // MBON counts in the naive readout below this are ignored
  minDanInput: number;        // MBONs with less DAN input (synapses) get no valence
  forgetPerRound: number;     // plastic factors relax toward 1 by this fraction each round
  cloneJitter: number;
  sim: SimParams;
  seed: number;
}

export const DEFAULT_GAME: GameParams = {
  nFlies: 8, glomPerOdor: 7, decisionMs: 600, learnMs: 400, observeMs: 300, observeGain: 0.1,
  temperature: 0.5, trustBias: 0, payoff: { T: 5, R: 3, P: 1, S: 0 }, ante: 2, startMoney: 30,
  baselineReps: 6, responsiveMin: 3, minDanInput: 20, forgetPerRound: 0.05, cloneJitter: 0.1,
  sim: DEFAULT_PARAMS, seed: 1,
};

export interface Fly {
  id: number; name: string; be: FlyBackend; money: number; alive: boolean; lineage: number; born: number;
  base: Float32Array;       // naive mean spike count per MBON per opponent odour: [opp * nMbon + j]
  trust: Float32Array;      // last decision score per opponent
  activity: Uint16Array | null; lastOpp: number;   // whole-circuit spike counts of the last decision (visualisation)
  movie: FlyMovie | null;                          // activity frames of the last decision and own-game teaching
  games: number; coops: number; defects: number; betrayed: number;
}

export interface FlyMovie { opp: number; decision: Frames | null; teach: Frames | null; dan: DanPop | null; valence: number }

export interface GameRecord {
  round: number; a: number; b: number; ca: boolean; cb: boolean; pa: number; pb: number; scoreA: number; scoreB: number; pcA: number; pcB: number;
}

export interface Snapshot {
  round: number; games: number; coopRate: number; recentCoopRate: number;
  flies: { id: number; name: string; money: number; alive: boolean; lineage: number; games: number; coops: number; defects: number; betrayed: number }[];
  trust: number[][];
  activity: (Uint16Array | null)[];   // per fly, whole-circuit spike counts of its last decision
  movies: (FlyMovie | null)[];
  pairs: { a: number; b: number; games: number; outcome: number; lastRound: number }[];   // social graph: outcome = mean(+1 CC, 0 mixed, −1 DD)
  last: GameRecord[];
}

export type BackendFactory = (id: number, seed: number) => Promise<FlyBackend> | FlyBackend;

export class Game {
  flies: Fly[] = []; odors: number[][] = []; round = 0; gamesPlayed = 0; coopTotal = 0; recent: boolean[] = [];
  approach: number[]; avoid: number[];
  mbon: number[]; valence: Int8Array;   // per MBON: +1 PPL1-compartment (approach when active), −1 PAM-compartment (avoid), 0 unassigned
  log: GameRecord[] = [];
  recordFrames = false;   // set by the UI at slow speeds
  pairStats = new Map<string, { a: number; b: number; games: number; sum: number; lastRound: number }>();
  private rng: () => number;
  get nMbon() { return this.mbon.length; }

  private constructor(readonly c: Circuit, readonly p: GameParams, private makeBackend: BackendFactory) {
    this.rng = mulberry32(p.seed);
    const mbon = c.ids('MBON'); this.mbon = mbon; const m0 = c.range('MBON')[0];
    // compartment valence from the connectome: which dopamine population innervates each MBON
    const pam = new Float32Array(mbon.length), ppl1 = new Float32Array(mbon.length);
    for (const d of c.ids('DAN')) for (let k = c.indptr[d]; k < c.indptr[d + 1]; k++) { const j = c.indices[k] - m0; if (j < 0 || j >= mbon.length) continue;
      if (c.typeName[d].startsWith('PAM')) pam[j] += c.weights[k]; else if (c.typeName[d].startsWith('PPL1')) ppl1[j] += c.weights[k]; }
    this.valence = Int8Array.from(mbon, (_, j) => (pam[j] + ppl1[j] < p.minDanInput ? 0 : ppl1[j] > pam[j] ? 1 : -1));
    this.approach = mbon.filter((_, j) => this.valence[j] > 0); this.avoid = mbon.filter((_, j) => this.valence[j] < 0);
    this.odors = this.makeOdors(p.nFlies, p.glomPerOdor);
  }

  static async create(c: Circuit, p: GameParams, makeBackend: BackendFactory, onProgress?: (msg: string) => void): Promise<Game> {
    const g = new Game(c, p, makeBackend);
    onProgress?.('building brains…');
    const flies = await Promise.all(Array.from({ length: p.nFlies }, (_, i) => g.newFly(i, i, 0)));
    g.flies = flies; return g;
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

  private async newFly(id: number, lineage: number, born: number, cloneOf?: Fly): Promise<Fly> {
    const be = await this.makeBackend(id, this.p.seed * 1000 + id * 17 + born);
    const f: Fly = { id, name: `F${id + 1}`, be, money: this.p.startMoney, alive: true, lineage, born,
      base: new Float32Array(this.p.nFlies * this.nMbon), trust: new Float32Array(this.p.nFlies), activity: null, lastOpp: -1, movie: null, games: 0, coops: 0, defects: 0, betrayed: 0 };
    if (cloneOf) {   // inherit memory + calibration; the parent's own odour is new to the clone
      await be.setPlastic(await cloneOf.be.getPlastic(), this.p.cloneJitter);
      f.base.set(cloneOf.base); f.trust.set(cloneOf.trust); f.trust[id] = 0;
      if (cloneOf.id !== id) { await this.calibrate(f, cloneOf.id); f.trust[cloneOf.id] = 0; }
      return f;
    }
    for (let o = 0; o < this.p.nFlies; o++) if (o !== id) await this.calibrate(f, o);
    return f;
  }

  counts(f: Fly, opp: number, frames = false) { return f.be.counts(this.odors[opp], this.p.decisionMs, this.mbon, frames); }

  /** Naive response to an opponent odour, averaged over baselineReps presentations. */
  async calibrate(f: Fly, opp: number) {
    const n = this.nMbon, o = opp * n; f.base.fill(0, o, o + n);
    for (let r = 0; r < this.p.baselineReps; r++) { const { c } = await this.counts(f, opp); for (let j = 0; j < n; j++) f.base[o + j] += c[j] / this.p.baselineReps; }
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
  async score(f: Fly, opp: number) { const { c, all, frames } = await this.counts(f, opp, this.recordFrames); f.activity = all; f.lastOpp = opp; f.movie = { opp, decision: frames ?? null, teach: null, dan: null, valence: 0 }; return this.toScore(f, opp, c); }

  async decide(f: Fly, opp: number): Promise<{ coop: boolean; score: number; pc: number }> {
    const s = await this.score(f, opp); f.trust[opp] = s;
    const pc = 1 / (1 + Math.exp(-(s + this.p.trustBias) / this.p.temperature));
    return { coop: this.rng() < pc, score: s, pc };
  }

  /** Present odour with dopamine. valence>0 → PAM at rate ∝ valence, <0 → PPL1. */
  async teach(f: Fly, opp: number, valence: number, ms: number, gain = 1, record = false) {
    if (valence === 0) return;
    const dan: DanPop = valence > 0 ? 'PAM' : 'PPL1';
    const fr = await f.be.teach(this.odors[opp], dan, Math.min(1, Math.abs(valence)) * gain, ms, record && this.recordFrames);
    if (record && f.movie && f.movie.opp === opp) { f.movie.teach = fr; f.movie.dan = dan; f.movie.valence = valence; }
  }

  payoffValence(pay: number): number {   // map payoff to dopamine valence in [-1, 1]
    const { T, R } = this.p.payoff;
    return pay >= R ? pay / T : -(R - pay) / R;
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

  async playRound(): Promise<GameRecord[]> {
    const pairs = this.pairings(); const { T, R, P, S } = this.p.payoff;
    // 1. decisions, all flies in parallel
    const dec = await Promise.all(pairs.map(([a, b]) => Promise.all([this.decide(this.flies[a], b), this.decide(this.flies[b], a)])));
    // 2. payoffs + bookkeeping
    const recs: GameRecord[] = []; const tasks = new Map<number, (() => Promise<void>)[]>(); const q = (id: number, t: () => Promise<void>) => (tasks.get(id) ?? tasks.set(id, []).get(id)!).push(t);
    pairs.forEach(([ia, ib], k) => {
      const A = this.flies[ia], B = this.flies[ib]; const [da, db] = dec[k];
      const pa = da.coop ? (db.coop ? R : S) : (db.coop ? T : P), pb = db.coop ? (da.coop ? R : S) : (da.coop ? T : P);
      A.money += pa - this.p.ante; B.money += pb - this.p.ante; A.games++; B.games++;
      if (da.coop) A.coops++; else A.defects++; if (db.coop) B.coops++; else B.defects++;
      if (da.coop && !db.coop) A.betrayed++; if (db.coop && !da.coop) B.betrayed++;
      q(ia, () => this.teach(A, ib, this.payoffValence(pa), this.p.learnMs, 1, true)); q(ib, () => this.teach(B, ia, this.payoffValence(pb), this.p.learnMs, 1, true));
      const key = ia < ib ? `${ia}-${ib}` : `${ib}-${ia}`; const ps = this.pairStats.get(key) ?? { a: Math.min(ia, ib), b: Math.max(ia, ib), games: 0, sum: 0, lastRound: 0 };
      ps.games++; ps.sum += da.coop && db.coop ? 1 : !da.coop && !db.coop ? -1 : 0; ps.lastRound = this.round; this.pairStats.set(key, ps);
      recs.push({ round: this.round, a: ia, b: ib, ca: da.coop, cb: db.coop, pa, pb, scoreA: da.score, scoreB: db.score, pcA: da.pc, pcB: db.pc });
      this.gamesPlayed++; this.coopTotal += (da.coop ? 1 : 0) + (db.coop ? 1 : 0); this.recent.push(da.coop, db.coop);
    });
    if (this.recent.length > 200) this.recent.splice(0, this.recent.length - 200);
    // 3. observation: every other alive fly learns about both players' actions
    if (this.p.observeGain > 0) for (const W of this.flies) if (W.alive) for (const r of recs) if (r.a !== W.id && r.b !== W.id) {
      q(W.id, () => this.teach(W, r.a, r.ca ? 0.6 : -1, this.p.observeMs, this.p.observeGain));
      q(W.id, () => this.teach(W, r.b, r.cb ? 0.6 : -1, this.p.observeMs, this.p.observeGain));
    }
    await Promise.all([...tasks.values()].map(async (list) => { for (const t of list) await t(); }));
    this.log.push(...recs);
    // 4. bankruptcy → replaced by a mutated clone of the current leader
    for (const f of this.flies.filter((x) => x.alive)) if (f.money <= 0) {
      f.alive = false; const leader = this.flies.filter((g) => g.alive).sort((x, y) => y.money - x.money)[0];
      if (leader) { const nf = await this.newFly(f.id, leader.lineage, this.round + 1, leader); f.be.dispose(); this.flies[f.id] = nf; }
    }
    await Promise.all(this.flies.filter((f) => f.alive).map((f) => f.be.forget(this.p.forgetPerRound)));
    this.round++;
    return recs;
  }

  snapshot(): Snapshot {
    const n = this.p.nFlies;
    return {
      round: this.round, games: this.gamesPlayed, coopRate: this.gamesPlayed ? this.coopTotal / (2 * this.gamesPlayed) : 0,
      recentCoopRate: this.recent.length ? this.recent.filter(Boolean).length / this.recent.length : 0,
      flies: this.flies.map((f) => ({ id: f.id, name: f.name, money: f.money, alive: f.alive, lineage: f.lineage, games: f.games, coops: f.coops, defects: f.defects, betrayed: f.betrayed })),
      trust: this.flies.map((f) => Array.from(f.trust)), activity: this.flies.map((f) => f.activity), movies: this.flies.map((f) => f.movie),
      pairs: [...this.pairStats.values()].map((p) => ({ a: p.a, b: p.b, games: p.games, outcome: p.sum / p.games, lastRound: p.lastRound })),
      last: this.log.slice(-Math.max(1, n)),
    };
  }

  dispose() { for (const f of this.flies) f.be.dispose(); }
}

/**
 * The arena: eight copies of the real mushroom body (simplified EM skeletons) on a ring.
 * Brains are drawn additively into an HDR target and tone-mapped, so dense lobes don't burn out.
 * Each brain plays back an activity movie of its last decision and of the dopamine that followed;
 * a persistent social graph between brains shows how each pair has treated each other.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import type { Circuit } from './circuit.ts';
import type { Snapshot, FlyMovie } from './game.ts';
import type { Frames } from './backend.ts';

interface SkelMeta { n: number; nseg: number; bbox: [number[], number[]]; layout: Record<string, { offset: number; length: number; dtype: string }> }

export const COOP = 0x4cc9a4, DEFECT = 0xe4572e, MIXED = 0xd9b04a;
const C = (h: number): [number, number, number] => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
const CLASS_COLOR: Record<number, [number, number, number]> = { 0: C(0x5aa9e6), 1: C(0xb9c0cc), 2: C(0xf2b134), 3: C(0xe4572e), 4: C(0x9b5de5), 5: C(0x7ae582) };
const PLAYBACK_SLOWDOWN = 1.6;   // movie plays 1.6× slower than brain time

interface Playback { movie: FlyMovie; t0: number }

export class Arena {
  renderer: THREE.WebGLRenderer; scene = new THREE.Scene(); camera: THREE.PerspectiveCamera; controls: OrbitControls;
  hdr: THREE.WebGLRenderTarget; toneScene = new THREE.Scene(); toneCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); toneMat: THREE.ShaderMaterial;
  brains: THREE.LineSegments[] = []; anchors: THREE.Vector3[] = []; labels: HTMLDivElement[] = [];
  act: Float32Array<ArrayBuffer>; actTex: THREE.DataTexture; nNeurons: number; nBrains: number;
  playback: (Playback | null)[]; danIds: number[]; pamIds: number[]; ppl1Ids: number[];
  graph = new THREE.Group(); edges = new Map<string, { line: Line2; mat: LineMaterial }>(); flashes: { obj: Line2; mat: LineMaterial; born: number }[] = [];
  raf = 0; lastT = performance.now(); resolution = new THREE.Vector2(1, 1);
  focused: number | null = null; camGoal = { pos: new THREE.Vector3(0, 5.6, 4.0), target: new THREE.Vector3(0, 0, 0) }; flying = false;   // camera animating toward camGoal; any user input takes over
  onFocus: ((b: number | null) => void) | null = null; private down: { x: number; y: number } | null = null;

  constructor(readonly container: HTMLElement, readonly c: Circuit, skelMeta: SkelMeta, skelBin: ArrayBuffer, nBrains: number) {
    this.nBrains = nBrains; this.nNeurons = c.n; this.playback = Array(nBrains).fill(null);
    this.danIds = c.ids('DAN'); this.pamIds = c.idsByPrefix('DAN', 'PAM'); this.ppl1Ids = c.idsByPrefix('DAN', 'PPL1');
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); this.renderer.setClearColor(0x000000, 0); this.renderer.autoClear = false;
    container.appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(22, 1, 0.01, 100);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement); this.controls.enableDamping = true; this.controls.dampingFactor = 0.08; this.controls.enablePan = false; this.controls.maxPolarAngle = Math.PI * 0.49; this.controls.minDistance = 3; this.controls.maxDistance = 14; this.controls.zoomSpeed = 0.8; this.controls.rotateSpeed = 0.7;
    this.act = new Float32Array(new ArrayBuffer(4 * this.nNeurons * nBrains));
    this.actTex = new THREE.DataTexture(this.act, this.nNeurons, nBrains, THREE.RedFormat, THREE.FloatType); this.actTex.magFilter = this.actTex.minFilter = THREE.NearestFilter; this.actTex.needsUpdate = true;
    const geo = this.buildGeometry(skelMeta, skelBin);
    const size = Math.max(...skelMeta.bbox[1].map((v, i) => v - skelMeta.bbox[0][i])); const scale = 0.42 / size;
    for (let b = 0; b < nBrains; b++) {
      const obj = new THREE.LineSegments(geo, this.material(b));
      const a = (b / nBrains) * Math.PI * 2 - Math.PI / 2; const pos = new THREE.Vector3(Math.cos(a) * 1.45, 0, Math.sin(a) * 0.95);
      obj.position.copy(pos); obj.scale.setScalar(scale); obj.rotation.x = -Math.PI / 2; obj.rotation.z = -a;
      this.scene.add(obj); this.brains.push(obj); this.anchors.push(pos);
      const lbl = document.createElement('div'); lbl.className = 'arena-label'; lbl.textContent = `F${b + 1}`; container.appendChild(lbl); this.labels.push(lbl);
    }
    this.scene.add(this.graph);
    // HDR accumulation + tone map
    this.hdr = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
    this.toneMat = new THREE.ShaderMaterial({
      uniforms: { tHdr: { value: this.hdr.texture }, uExposure: { value: 1.0 } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      // transparent output: the island behind the canvas shows through; alpha follows the tone-mapped brightness (premultiplied)
      fragmentShader: `uniform sampler2D tHdr; uniform float uExposure; varying vec2 vUv;
        void main() { vec3 h = texture2D(tHdr, vUv).rgb * uExposure; vec3 t = vec3(1.0) - exp(-h); gl_FragColor = vec4(t, max(max(t.r, t.g), t.b)); }`,
      depthTest: false, depthWrite: false, transparent: true, blending: THREE.NoBlending,
    });
    this.toneScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.toneMat));
    this.camera.position.set(0, 5.6, 4.0); this.camera.lookAt(0, 0, 0);
    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', (e) => { this.down = { x: e.clientX, y: e.clientY }; this.flying = false; });
    el.addEventListener('wheel', () => (this.flying = false), { passive: true });
    el.addEventListener('pointerup', (e) => { if (!this.down) return; const moved = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y); this.down = null; if (moved > 6) return; this.focus(this.pick(e.clientX, e.clientY)); });
    addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Escape') this.focus(null); });
    this.resize(); addEventListener('resize', () => this.resize());
    this.loop();
  }

  private buildGeometry(m: SkelMeta, bin: ArrayBuffer): THREE.BufferGeometry {
    const L = m.layout; const segOff = new Uint32Array(bin, L.segOff.offset, L.segOff.length); const xyz = new Float32Array(bin, L.xyz.offset, L.xyz.length);
    const nv = m.nseg * 2; const nid = new Float32Array(nv), col = new Float32Array(nv * 3);
    const pam = new Set(this.pamIds), ppl1 = new Set(this.ppl1Ids);
    for (let i = 0; i < m.n; i++) {
      const c = pam.has(i) ? C(COOP) : ppl1.has(i) ? C(DEFECT) : (CLASS_COLOR[this.c.cls[i]] ?? [1, 1, 1]);
      for (let s = segOff[i]; s < segOff[i + 1]; s++) for (let k = 0; k < 2; k++) { const v = s * 2 + k; nid[v] = i; col[v * 3] = c[0]; col[v * 3 + 1] = c[1]; col[v * 3 + 2] = c[2]; }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(xyz, 3)); geo.setAttribute('nid', new THREE.BufferAttribute(nid, 1)); geo.setAttribute('col', new THREE.BufferAttribute(col, 3));
    return geo;
  }

  private material(brain: number) {
    return new THREE.ShaderMaterial({
      uniforms: { uAct: { value: this.actTex }, uBrain: { value: brain }, uN: { value: this.nNeurons }, uNB: { value: this.nBrains }, uDim: { value: 1 } },
      vertexShader: `attribute float nid; attribute vec3 col; uniform sampler2D uAct; uniform float uBrain, uN, uNB; varying vec3 vCol; varying float vA;
        void main() { vA = texture2D(uAct, vec2((nid + 0.5) / uN, (uBrain + 0.5) / uNB)).r; vCol = col; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vCol; varying float vA; uniform float uDim;
        void main() { float a = clamp(vA, 0.0, 1.0); vec3 glow = mix(vCol, vec3(1.0, 0.97, 0.9), a * 0.5); gl_FragColor = vec4(glow * (0.018 + 0.6 * a) * uDim, 1.0); }`,
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    });
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight; const pr = this.renderer.getPixelRatio();
    this.renderer.setSize(w, h, false); this.hdr.setSize(Math.floor(w * pr), Math.floor(h * pr)); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.resolution.set(w * pr, h * pr); for (const e of this.edges.values()) e.mat.resolution.copy(this.resolution); for (const f of this.flashes) f.mat.resolution.copy(this.resolution);
  }

  /** Feed a snapshot: queue activity movies, update the social graph and labels. */
  update(s: Snapshot) {
    const now = performance.now(); const n = this.nNeurons;
    for (let b = 0; b < this.nBrains; b++) {
      const m = s.movies[b];
      if (m && (m.decision || m.teach)) { this.playback[b] = { movie: m, t0: now }; this.lastMovie[b] = m; }
      else if (s.activity[b]) { const a = s.activity[b]!; const row = b * n; for (let i = 0; i < n; i++) this.act[row + i] = Math.max(this.act[row + i], Math.min(1.5, a[i] / 25)); this.actTex.needsUpdate = true; }
    }
    // social graph: one persistent edge per pair, colour = mean outcome, width = games; latest games flash
    for (const p of s.pairs) {
      const key = `${p.a}-${p.b}`; let e = this.edges.get(key);
      if (!e) { const g = new LineGeometry(); g.setPositions([...this.anchors[p.a].toArray(), ...this.anchors[p.b].toArray()]); const mat = new LineMaterial({ color: 0xffffff, linewidth: 1, transparent: true, opacity: 0.3, depthTest: false }); mat.resolution.copy(this.resolution); const line = new Line2(g, mat); line.computeLineDistances(); this.graph.add(line); e = { line, mat }; this.edges.set(key, e); }
      e.mat.color.set(this.outcomeColor(p.outcome)); e.mat.linewidth = 0.5 + Math.min(6, p.games) * 0.25; e.mat.opacity = 0.16 + Math.min(1, p.games / 8) * 0.3;
      if (p.lastRound === s.round - 1) { const g = new LineGeometry(); g.setPositions([...this.anchors[p.a].toArray(), ...this.anchors[p.b].toArray()]); const mat = new LineMaterial({ color: this.outcomeColor(s.last.find((r) => (r.a === p.a && r.b === p.b) || (r.a === p.b && r.b === p.a))?.ca === undefined ? p.outcome : this.recOutcome(s.last.find((r) => (r.a === p.a && r.b === p.b) || (r.a === p.b && r.b === p.a))!)), linewidth: 2.2, transparent: true, opacity: 0.95, depthTest: false }); mat.resolution.copy(this.resolution); const line = new Line2(g, mat); this.graph.add(line); this.flashes.push({ obj: line, mat, born: now }); }
    }
    this.dead = s.flies.map((f) => !f.alive);
    for (let b = 0; b < this.nBrains; b++) { const f = s.flies[b]; this.labels[b].textContent = `${f.name} · ${f.money.toFixed(0)}${this.tags[b] ? ' · ' + this.tags[b] : ''}`; this.labels[b].classList.toggle('dead', !f.alive); }
  }
  private recOutcome(r: { ca: boolean; cb: boolean }) { return r.ca && r.cb ? 1 : !r.ca && !r.cb ? -1 : 0; }
  private outcomeColor(o: number): THREE.Color { const c = new THREE.Color(); return o >= 0 ? c.set(MIXED).lerp(new THREE.Color(COOP), o) : c.set(MIXED).lerp(new THREE.Color(DEFECT), -o); }

  /** Apply the movie frame for time t (ms since playback start) to brain b; returns false when finished. */
  private applyMovie(b: number, pb: Playback, now: number): boolean {
    const n = this.nNeurons, row = b * n; const t = (now - pb.t0) / (this.focused === b ? PLAYBACK_SLOWDOWN * 2.5 : PLAYBACK_SLOWDOWN);
    const seq: { fr: Frames; gain: number }[] = []; if (pb.movie.decision) seq.push({ fr: pb.movie.decision, gain: 1 }); if (pb.movie.teach) seq.push({ fr: pb.movie.teach, gain: 1 });
    let acc = 0;
    for (const { fr } of seq) { const dur = fr.bins * fr.binMs; if (t < acc + dur) { const bin = Math.min(fr.bins - 1, Math.floor((t - acc) / fr.binMs)); const off = bin * fr.n; for (let i = 0; i < n; i++) { const v = fr.data[off + i] * 0.9; if (v > this.act[row + i]) this.act[row + i] = Math.min(1.5, v); } return true; } acc += dur; }
    return false;
  }

  /** Nearest brain anchor to a screen point, within 90 px. */
  pick(cx: number, cy: number): number | null {
    const r = this.container.getBoundingClientRect(); const w = r.width, h = r.height; const v = new THREE.Vector3(); let best: number | null = null, bd = 90;
    for (let b = 0; b < this.nBrains; b++) { v.copy(this.anchors[b]).project(this.camera); const d = Math.hypot(((v.x + 1) / 2) * w - (cx - r.left), ((1 - v.y) / 2) * h - (cy - r.top)); if (d < bd) { bd = d; best = b; } }
    return best;
  }
  /** Close-up on brain b (null = back to the ring). Replays the brain's last movie slowly. */
  focus(b: number | null) {
    this.focused = b; this.flying = true; const c = this.controls;
    if (b === null) { this.camGoal = { pos: new THREE.Vector3(0, 5.6, 4.0), target: new THREE.Vector3(0, 0, 0) }; c.minDistance = 3; c.maxDistance = 14; c.maxPolarAngle = Math.PI * 0.49; }
    else { const a = this.anchors[b]; this.camGoal = { pos: a.clone().add(new THREE.Vector3(0, 0.95, 0.55)), target: a.clone() }; c.minDistance = 0.35; c.maxDistance = 2.4; c.maxPolarAngle = Math.PI; this.replay(b); }
    this.onFocus?.(b);
  }
  /** Restart the brain's last movie from the beginning. */
  replay(b: number) { const pb = this.playback[b]; if (pb) pb.t0 = performance.now(); else if (this.lastMovie[b]) this.playback[b] = { movie: this.lastMovie[b]!, t0: performance.now() }; }
  lastMovie: (FlyMovie | null)[] = []; tags: string[] = []; dead: boolean[] = [];
  setTags(t: string[]) { this.tags = t.map((x) => (x === 'intact' ? '' : x)); }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now(); const dt = Math.min(0.1, (now - this.lastT) / 1000); this.lastT = now;
    const k = Math.exp(-dt / 0.25);
    for (let i = 0; i < this.act.length; i++) this.act[i] = this.act[i] > 0.002 ? this.act[i] * k : 0;
    for (let b = 0; b < this.nBrains; b++) { const pb = this.playback[b]; if (pb && !this.applyMovie(b, pb, now)) this.playback[b] = null; }
    this.actTex.needsUpdate = true;
    for (let i = this.flashes.length - 1; i >= 0; i--) { const f = this.flashes[i]; const age = (now - f.born) / 1000; f.mat.opacity = Math.max(0, 0.95 - age * 0.45); if (age > 2.2) { this.graph.remove(f.obj); f.obj.geometry.dispose(); f.mat.dispose(); this.flashes.splice(i, 1); } }
    if (this.flying) { const k = 1 - Math.exp(-dt * 4); this.controls.target.lerp(this.camGoal.target, k); this.camera.position.lerp(this.camGoal.pos, k); if (this.camera.position.distanceTo(this.camGoal.pos) < 0.01) { this.camera.position.copy(this.camGoal.pos); this.controls.target.copy(this.camGoal.target); this.flying = false; } }
    for (let b = 0; b < this.nBrains; b++) { const u = (this.brains[b].material as THREE.ShaderMaterial).uniforms.uDim; const goal = (this.focused === null || this.focused === b ? 1 : 0.12) * (this.dead[b] ? 0.2 : 1); u.value += (goal - u.value) * (1 - Math.exp(-dt * 6)); }
    this.graph.visible = this.focused === null;
    this.controls.update();
    // pass 1: brains into HDR (additive); pass 2: tone map to screen; pass 3: graph + overlays on top
    this.renderer.setRenderTarget(this.hdr); this.renderer.clear(); for (const g of [this.graph]) g.visible = false; this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null); this.renderer.render(this.toneScene, this.toneCam);
    if (this.focused === null) { this.graph.visible = true; for (const b of this.brains) b.visible = false; this.renderer.render(this.scene, this.camera); for (const b of this.brains) b.visible = true; }
    const w = this.container.clientWidth, h = this.container.clientHeight; const v = new THREE.Vector3();
    for (let b = 0; b < this.nBrains; b++) { this.labels[b].style.opacity = this.focused === null || this.focused === b ? '1' : '0'; v.copy(this.anchors[b]); v.z += 0.3; v.project(this.camera); this.labels[b].style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, 0)`; }
  };

  static async load(container: HTMLElement, c: Circuit, nBrains: number, base = '/data/skel_R') {
    const [meta, bin] = await Promise.all([fetch(`${base}.json`).then((r) => r.json() as Promise<SkelMeta>), fetch(`${base}.bin`).then((r) => r.arrayBuffer())]);
    return new Arena(container, c, meta, bin, nBrains);
  }
}

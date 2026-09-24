/**
 * The arena: nine copies of the real mushroom body (simplified EM skeletons) on a ring.
 * Each brain glows where its neurons fired during the fly's last decision; lines between
 * brains show the last round's games coloured by outcome.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Circuit } from './circuit.ts';
import type { Snapshot } from './game.ts';

interface SkelMeta { n: number; nseg: number; bbox: [number[], number[]]; layout: Record<string, { offset: number; length: number; dtype: string }> }

const CLASS_COLOR: Record<number, [number, number, number]> = { 0: [0.35, 0.62, 0.95], 1: [0.62, 0.66, 0.74], 2: [0.98, 0.72, 0.22], 3: [0.93, 0.36, 0.22], 4: [0.62, 0.36, 0.95], 5: [0.45, 0.85, 0.55] };
export const COOP = 0x4cc9a4, DEFECT = 0xe4572e, MIXED = 0xd9b04a;

export class Arena {
  renderer: THREE.WebGLRenderer; scene = new THREE.Scene(); camera: THREE.PerspectiveCamera; controls: OrbitControls;
  brains: THREE.LineSegments[] = []; anchors: THREE.Vector3[] = []; labels: HTMLDivElement[] = [];
  act: Float32Array<ArrayBuffer>; actTex: THREE.DataTexture; nNeurons: number; nBrains: number;
  links = new THREE.Group(); linkFade: { obj: THREE.Line; born: number }[] = [];
  ring = 1; raf = 0; lastT = performance.now();

  constructor(readonly container: HTMLElement, readonly c: Circuit, skelMeta: SkelMeta, skelBin: ArrayBuffer, nBrains: number) {
    this.nBrains = nBrains; this.nNeurons = c.n;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); this.renderer.setClearColor(0x0b0d12, 1);
    container.appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(22, 1, 0.01, 100);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement); this.controls.enableDamping = true; this.controls.dampingFactor = 0.08; this.controls.enablePan = false;
    // activity texture: one row per brain, one texel per neuron
    this.act = new Float32Array(new ArrayBuffer(4 * this.nNeurons * nBrains));
    this.actTex = new THREE.DataTexture(this.act, this.nNeurons, nBrains, THREE.RedFormat, THREE.FloatType); this.actTex.magFilter = this.actTex.minFilter = THREE.NearestFilter; this.actTex.needsUpdate = true;
    const geo = this.buildGeometry(skelMeta, skelBin);
    const size = Math.max(...skelMeta.bbox[1].map((v, i) => v - skelMeta.bbox[0][i]));
    const scale = 0.42 / size;   // brain fits in a ~0.42 unit box
    this.ring = 1.0;
    for (let b = 0; b < nBrains; b++) {
      const mat = this.material(b);
      const obj = new THREE.LineSegments(geo, mat);
      const a = (b / nBrains) * Math.PI * 2 - Math.PI / 2; const pos = new THREE.Vector3(Math.cos(a) * this.ring * 1.45, 0, Math.sin(a) * this.ring * 0.95);
      obj.position.copy(pos); obj.scale.setScalar(scale); obj.rotation.x = -Math.PI / 2; obj.rotation.z = -a;
      this.scene.add(obj); this.brains.push(obj); this.anchors.push(pos);
      const lbl = document.createElement('div'); lbl.className = 'arena-label'; lbl.textContent = `F${b + 1}`; container.appendChild(lbl); this.labels.push(lbl);
    }
    this.scene.add(this.links);
    this.camera.position.set(0, 5.6, 4.0); this.camera.lookAt(0, 0, 0);
    this.resize(); addEventListener('resize', () => this.resize());
    this.loop();
  }

  private buildGeometry(m: SkelMeta, bin: ArrayBuffer): THREE.BufferGeometry {
    const L = m.layout; const segOff = new Uint32Array(bin, L.segOff.offset, L.segOff.length); const xyz = new Float32Array(bin, L.xyz.offset, L.xyz.length);
    const nv = m.nseg * 2; const nid = new Float32Array(nv), col = new Float32Array(nv * 3);
    for (let i = 0; i < m.n; i++) { const c = CLASS_COLOR[this.c.cls[i]] ?? [1, 1, 1]; for (let s = segOff[i]; s < segOff[i + 1]; s++) for (let k = 0; k < 2; k++) { const v = s * 2 + k; nid[v] = i; col[v * 3] = c[0]; col[v * 3 + 1] = c[1]; col[v * 3 + 2] = c[2]; } }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(xyz, 3)); geo.setAttribute('nid', new THREE.BufferAttribute(nid, 1)); geo.setAttribute('col', new THREE.BufferAttribute(col, 3));
    return geo;
  }

  private material(brain: number) {
    return new THREE.ShaderMaterial({
      uniforms: { uAct: { value: this.actTex }, uBrain: { value: brain }, uN: { value: this.nNeurons }, uNB: { value: this.nBrains }, uDim: { value: 1.0 } },
      vertexShader: `attribute float nid; attribute vec3 col; uniform sampler2D uAct; uniform float uBrain, uN, uNB, uDim; varying vec3 vCol; varying float vA;
        void main() { float a = texture2D(uAct, vec2((nid + 0.5) / uN, (uBrain + 0.5) / uNB)).r; vA = a; vCol = col; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vCol; varying float vA; uniform float uDim;
        void main() { float a = clamp(vA, 0.0, 1.0); vec3 glow = mix(vCol, vec3(1.0, 0.97, 0.88), a * 0.7); float alpha = (0.018 + 0.35 * a) * uDim; gl_FragColor = vec4(glow * alpha, alpha); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
  }

  resize() { const w = this.container.clientWidth, h = this.container.clientHeight; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }

  /** Feed a snapshot: set activity per brain from its last decision, draw last round's links. */
  update(s: Snapshot) {
    const n = this.nNeurons;
    for (let b = 0; b < this.nBrains; b++) { const a = s.activity[b]; if (!a) continue; const row = b * n; for (let i = 0; i < n; i++) this.act[row + i] = Math.max(this.act[row + i], Math.min(1.5, a[i] / 25)); }
    this.actTex.needsUpdate = true;
    const now = performance.now();
    for (const r of s.last.filter((x) => x.round === s.round - 1)) {
      const color = r.ca && r.cb ? COOP : !r.ca && !r.cb ? DEFECT : MIXED;
      const geo = new THREE.BufferGeometry().setFromPoints([this.anchors[r.a], this.anchors[r.b]]);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
      this.links.add(line); this.linkFade.push({ obj: line, born: now });
    }
    for (let b = 0; b < this.nBrains; b++) { const f = s.flies[b]; this.labels[b].textContent = `${f.name} · ${f.money.toFixed(0)}`; this.labels[b].classList.toggle('dead', !f.alive); }
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now(); const dt = Math.min(0.1, (now - this.lastT) / 1000); this.lastT = now;
    const k = Math.exp(-dt / 0.9); let any = false;
    for (let i = 0; i < this.act.length; i++) if (this.act[i] > 0.002) { this.act[i] *= k; any = true; } else this.act[i] = 0;
    if (any) this.actTex.needsUpdate = true;
    for (let i = this.linkFade.length - 1; i >= 0; i--) { const l = this.linkFade[i]; const age = (now - l.born) / 1000; const m = l.obj.material as THREE.LineBasicMaterial; m.opacity = Math.max(0, 0.9 - age * 0.3); if (age > 3) { this.links.remove(l.obj); l.obj.geometry.dispose(); m.dispose(); this.linkFade.splice(i, 1); } }
    this.controls.update(); this.renderer.render(this.scene, this.camera);
    // labels
    const w = this.container.clientWidth, h = this.container.clientHeight; const v = new THREE.Vector3();
    for (let b = 0; b < this.nBrains; b++) { v.copy(this.anchors[b]); v.z += 0.3; v.project(this.camera); this.labels[b].style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, 0)`; }
  };

  static async load(container: HTMLElement, c: Circuit, nBrains: number, base = '/data/skel_R') {
    const [meta, bin] = await Promise.all([fetch(`${base}.json`).then((r) => r.json() as Promise<SkelMeta>), fetch(`${base}.bin`).then((r) => r.arrayBuffer())]);
    return new Arena(container, c, meta, bin, nBrains);
  }
}

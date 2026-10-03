import * as THREE from 'three';

/**
 * BLU as a real 3D character: battery body, cartoon face, gloved arms and sneakers.
 * Every joint is a THREE.Group, and the animator blends toward target poses every frame,
 * so switching between idle / run / jump / flip / slide / dash / charge / celebrate is smooth.
 * Local forward is +Z. Set `root.position` and call `update()` every frame.
 */
export type BluPose = {
  speed: number;        // 0..1 horizontal speed
  grounded: boolean;
  vy: number;
  sliding: boolean;
  dashing: boolean;
  charging: boolean;
  celebrating: boolean;
  overcharge: boolean;
  waving: boolean;      // title screen greeting
  yaw: number;          // desired facing (radians)
};

export const INK = 0x0b2a5b;
let sharedGradient: THREE.DataTexture | null = null;
export function toonGradient() {
  if (sharedGradient) return sharedGradient;
  const tex = new THREE.DataTexture(new Uint8Array([96, 178, 255]), 3, 1, THREE.RedFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.needsUpdate = true;
  sharedGradient = tex; return tex;
}
export const toon = (color: number, emissive = 0x000000, emissiveIntensity = 0) =>
  new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), emissive, emissiveIntensity });

/** Inverted-hull outline: the cartoon ink line used by mobile runner games. */
function hullGeometry(geo: THREE.BufferGeometry, t: number) {
  const g = geo.clone(); const p = g.attributes.position; const n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * t, p.getY(i) + n.getY(i) * t, p.getZ(i) + n.getZ(i) * t);
  return g;
}

const damp = THREE.MathUtils.damp;
function dampAngle(a: number, b: number, l: number, dt: number) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * (1 - Math.exp(-l * dt)); }

type Arm = { shoulder: THREE.Group; elbow: THREE.Group; hand: THREE.Group; side: number };
type Leg = { hip: THREE.Group; knee: THREE.Group; ankle: THREE.Group; side: number };

export class BluRig {
  root = new THREE.Group();
  private mover = new THREE.Group();   // bob + flip
  private body = new THREE.Group();    // lean + squash
  private arms: Arm[] = []; private legs: Leg[] = [];
  private eyes: THREE.Group[] = []; private irises: THREE.Group[] = []; private brows: THREE.Group[] = [];
  private mouth = new THREE.Group();
  private bodyMat: THREE.MeshStandardMaterial;
  private shoeMat!: THREE.MeshToonMaterial; private gloveMat!: THREE.MeshToonMaterial; private lastLook="";
  private decalCanvas: HTMLCanvasElement; private decalTex: THREE.CanvasTexture; private decalBars = -1;
  private backBolt: THREE.MeshBasicMaterial;
  private disposables: { dispose: () => void }[] = [];
  private outlineMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  // animation state
  private phase = 0; private t = 0; private blinkIn = 2; private blinkT = 0; private flipT = 0; private landT = 0; private landAmt = 0;
  private glance = new THREE.Vector2(); private glanceTarget = new THREE.Vector2(); private glanceIn = 1.5;
  private j: Record<string, number> = {};

  constructor() {
    const R = 0.56, H = 1.45, LEG = 0.8;
    const blue = new THREE.MeshStandardMaterial({color:0x1f7bff,roughness:.3,metalness:.22,emissive:0x2aa8ff,emissiveIntensity:.12}), rim = toon(0x7fd4ff), navy = toon(0x17306a), white = toon(0xffffff), silver = toon(0xcfdcec), shoe = toon(0x1c5fe6);
    this.bodyMat = blue;this.shoeMat=shoe as THREE.MeshToonMaterial;this.gloveMat=toon(0xffffff) as THREE.MeshToonMaterial;this.disposables.push(this.gloveMat);
    this.disposables.push(blue, rim, navy, white, silver, shoe, this.outlineMat);
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, ink = 0.022) => {
      const m = new THREE.Mesh(geo, mat); parent.add(m); this.disposables.push(geo);
      if (ink > 0) { const hg = hullGeometry(geo, ink); const o = new THREE.Mesh(hg, this.outlineMat); m.add(o); this.disposables.push(hg); }
      return m;
    };

    this.root.add(this.mover);
    this.body.position.y = LEG; this.mover.add(this.body);

    // Battery body with rounded shoulders (lathe keeps normals smooth for a clean outline)
    const prof: THREE.Vector2[] = []; const c = 0.13;
    prof.push(new THREE.Vector2(0, 0));
    for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * Math.PI / 2; prof.push(new THREE.Vector2(R - c + Math.cos(a) * c, c + Math.sin(a) * c)); }
    for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; prof.push(new THREE.Vector2(R - c + Math.cos(a) * c, H - c + Math.sin(a) * c)); }
    prof.push(new THREE.Vector2(0, H));
    add(new THREE.LatheGeometry(prof, 40), blue, this.body, 0.03);
    for (const y of [0.17, H - 0.14]) { const ring = add(new THREE.TorusGeometry(R + 0.004, 0.028, 8, 40), rim, this.body, 0); ring.rotation.x = Math.PI / 2; ring.position.y = y; }
    const capBase = add(new THREE.CylinderGeometry(0.27, 0.29, 0.06, 28), silver, this.body, 0.018); capBase.position.y = H + 0.02;
    const cap = add(new THREE.CylinderGeometry(0.19, 0.2, 0.15, 28), silver, this.body, 0.018); cap.position.y = H + 0.11;

    // Front decal: "BLU" + live charge meter (redrawn when energy changes)
    this.decalCanvas = document.createElement('canvas'); this.decalCanvas.width = 512; this.decalCanvas.height = 320;
    this.decalTex = new THREE.CanvasTexture(this.decalCanvas); this.decalTex.colorSpace = THREE.SRGBColorSpace; this.decalTex.anisotropy = 4;
    const decalMat = new THREE.MeshBasicMaterial({ map: this.decalTex, transparent: true, depthWrite: false });
    this.disposables.push(this.decalTex, decalMat);
    const decal = add(new THREE.CylinderGeometry(R + 0.006, R + 0.006, 0.5, 32, 1, true, -0.8, 1.6), decalMat, this.body, 0);
    decal.position.y = 0.42; decal.renderOrder = 2;
    this.setEnergy(100);
    // Back: a glowing bolt, so the player sees BLU's energy while running away from camera
    this.backBolt = new THREE.MeshBasicMaterial({ color: 0x5ff4ff }); this.disposables.push(this.backBolt);
    const bs = new THREE.Shape(); bs.moveTo(0.05, 0.3); bs.lineTo(-0.14, -0.02); bs.lineTo(0.0, -0.02); bs.lineTo(-0.06, -0.3); bs.lineTo(0.15, 0.06); bs.lineTo(0.01, 0.06); bs.lineTo(0.05, 0.3);
    const bolt = add(new THREE.ShapeGeometry(bs), this.backBolt, this.body, 0); bolt.position.set(0, 0.62, -R - 0.012); bolt.rotation.y = Math.PI;

    // Face
    const face = new THREE.Group(); face.position.y = 1.02; this.body.add(face);
    const iris = new THREE.MeshBasicMaterial({ color: 0x1d5fd6 }), pupil = new THREE.MeshBasicMaterial({ color: 0x06132e }), shine = new THREE.MeshBasicMaterial({ color: 0xffffff }), eyeWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.disposables.push(iris, pupil, shine, eyeWhite);
    for (const s of [-1, 1]) {
      const x = s * 0.2, z = Math.sqrt(R * R - x * x) - 0.035;
      const eye = new THREE.Group(); eye.position.set(x, 0.02, z); eye.rotation.y = Math.atan2(x, z) * 0.9; face.add(eye);
      const w = add(new THREE.SphereGeometry(0.175, 24, 16), eyeWhite, eye, 0.018); w.scale.set(1, 1.18, 0.55);
      const ir = new THREE.Group(); ir.position.z = 0.1; eye.add(ir);
      add(new THREE.CircleGeometry(0.092, 24), iris, ir, 0);
      const p = add(new THREE.CircleGeometry(0.045, 20), pupil, ir, 0); p.position.z = 0.002;
      const h = add(new THREE.CircleGeometry(0.022, 12), shine, ir, 0); h.position.set(0.028, 0.03, 0.004);
      this.eyes.push(eye); this.irises.push(ir);
      const brow = new THREE.Group(); brow.position.set(x, 0.25, Math.sqrt(R * R - x * x) + 0.01); brow.rotation.y = Math.atan2(x, 0.5); face.add(brow);
      const bm = add(new THREE.CapsuleGeometry(0.03, 0.15, 4, 8), navy, brow, 0.012); bm.rotation.z = Math.PI / 2;
      this.brows.push(brow);
    }
    // Mouth: open smile with teeth and tongue; scale.y animates how open it is
    const ms = new THREE.Shape(); ms.moveTo(-0.17, 0); ms.lineTo(0.17, 0); ms.absarc(0, 0, 0.17, 0, -Math.PI, true);
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x6d0f24 }), tongue = new THREE.MeshBasicMaterial({ color: 0xff6f8e }), teeth = new THREE.MeshBasicMaterial({ color: 0xffffff }), lip = new THREE.MeshBasicMaterial({ color: INK });
    this.disposables.push(mouthMat, tongue, teeth, lip);
    this.mouth.position.set(0, -0.22, R + 0.01); face.add(this.mouth);
    const lipShape = new THREE.Shape(); lipShape.moveTo(-0.195, 0.018); lipShape.lineTo(0.195, 0.018); lipShape.absarc(0, 0.018, 0.195, 0, -Math.PI, true);
    add(new THREE.ShapeGeometry(lipShape, 20), lip, this.mouth, 0).position.z = -0.002;
    add(new THREE.ShapeGeometry(ms, 20), mouthMat, this.mouth, 0);
    const tg = add(new THREE.CircleGeometry(0.065, 20), tongue, this.mouth, 0); tg.position.set(0.025, -0.105, 0.002); tg.scale.y = 0.55;
    const th = add(new THREE.PlaneGeometry(0.25, 0.04), teeth, this.mouth, 0); th.position.set(0, -0.02, 0.003);

    // Arms
    for (const s of [-1, 1]) {
      const shoulder = new THREE.Group(); shoulder.position.set(s * (R - 0.02), 0.78, 0); this.body.add(shoulder);
      const up = add(new THREE.CapsuleGeometry(0.085, 0.2, 4, 10), navy, shoulder); up.position.y = -0.17;
      const elbow = new THREE.Group(); elbow.position.y = -0.33; shoulder.add(elbow);
      const lo = add(new THREE.CapsuleGeometry(0.08, 0.18, 4, 10), navy, elbow); lo.position.y = -0.15;
      const hand = new THREE.Group(); hand.position.y = -0.33; elbow.add(hand);
      const cuff = add(new THREE.TorusGeometry(0.1, 0.045, 8, 20), rim, hand, 0.015); cuff.rotation.x = Math.PI / 2; cuff.position.y = 0.04;
      const glove = add(new THREE.SphereGeometry(0.165, 20, 14), this.gloveMat, hand, 0.022); glove.position.y = -0.1; glove.scale.set(1, 0.95, 0.9);
      const thumb = add(new THREE.CapsuleGeometry(0.05, 0.08, 4, 8), this.gloveMat, hand, 0.016); thumb.position.set(-s * 0.06, -0.04, 0.12); thumb.rotation.x = -0.5;
      this.arms.push({ shoulder, elbow, hand, side: s });
    }
    // Legs and sneakers
    const sole = toon(0xffffff), bolt2 = new THREE.MeshBasicMaterial({ color: 0x5ff4ff }); this.disposables.push(sole, bolt2);
    for (const s of [-1, 1]) {
      const hip = new THREE.Group(); hip.position.set(s * 0.23, LEG + 0.04, 0); this.mover.add(hip);
      const th = add(new THREE.CapsuleGeometry(0.085, 0.2, 4, 10), navy, hip); th.position.y = -0.17;
      const knee = new THREE.Group(); knee.position.y = -0.34; hip.add(knee);
      const sh = add(new THREE.CapsuleGeometry(0.08, 0.2, 4, 10), navy, knee); sh.position.y = -0.16;
      const ankle = new THREE.Group(); ankle.position.y = -0.34; knee.add(ankle);
      const upper = add(new THREE.SphereGeometry(0.17, 20, 14), shoe, ankle, 0.02); upper.scale.set(0.95, 0.72, 1.45); upper.position.set(0, -0.03, 0.07);
      const sl = add(new THREE.SphereGeometry(0.17, 20, 10), sole, ankle, 0.018); sl.scale.set(1.02, 0.34, 1.52); sl.position.set(0, -0.11, 0.07);
      const collar = add(new THREE.TorusGeometry(0.1, 0.035, 8, 18), sole, ankle, 0); collar.rotation.x = Math.PI / 2; collar.position.y = 0.06;
      const strap = add(new THREE.BoxGeometry(0.3, 0.05, 0.12), sole, ankle, 0); strap.position.set(0, 0.05, 0.16); strap.rotation.x = 0.35;
      const fb = add(new THREE.ShapeGeometry(bs), bolt2, ankle, 0); fb.scale.setScalar(0.28); fb.position.set(s * 0.165, -0.03, 0.05); fb.rotation.y = s * Math.PI / 2;
      this.legs.push({ hip, knee, ankle, side: s });
    }
    // Blob shadow (cheap, reads well on phones)
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x1a0f3a, transparent: true, opacity: 0.35, depthWrite: false }); this.disposables.push(shadowMat);
    const shadow = add(new THREE.CircleGeometry(0.62, 24), shadowMat, this.root, 0); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; shadow.name = 'shadow';
  }

  setEquipment(p: {skin:string;inventory:string[]}) {
    const look=p.skin+p.inventory.join();if(look===this.lastLook)return;this.lastLook=look;
    this.bodyMat.color.setHex(p.skin==="gold"?0xffc84a:p.skin==="neon"?0x3fffc8:p.inventory.includes("battery")?0x91b9dd:0x1f7bff);
    this.shoeMat.color.setHex(p.inventory.includes("shoes")?0xff664f:0x1c5fe6);this.gloveMat.color.setHex(p.inventory.includes("gloves")?0xffcf45:0xffffff);
  }

  setEnergy(energy: number) {
    const bars = Math.max(0, Math.min(4, Math.ceil(energy / 25)));
    if (bars === this.decalBars) return; this.decalBars = bars;
    const g = this.decalCanvas.getContext('2d'); if (!g) return;
    g.clearRect(0, 0, 512, 320);
    g.font = '900 150px Rubik, "Arial Black", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = 22; g.strokeStyle = '#0b2a5b'; g.strokeText('BLU', 256, 92); g.fillStyle = '#ffffff'; g.fillText('BLU', 256, 92);
    g.fillStyle = '#0b2a5b'; g.beginPath(); g.roundRect(96, 196, 320, 104, 26); g.fill();
    g.fillStyle = '#0e3f86'; g.beginPath(); g.roundRect(110, 210, 292, 76, 16); g.fill();
    for (let i = 0; i < 4; i++) { g.fillStyle = i < bars ? (bars <= 1 ? '#ff5d73' : '#6ff7ff') : '#1c4f96'; g.beginPath(); g.roundRect(122 + i * 70, 220, 58, 56, 10); g.fill(); }
    this.decalTex.needsUpdate = true;
  }

  /** Called when the player jumps; a double jump performs a front flip. */
  jump(double: boolean) { if (double) this.flipT = 0.52; this.landT = 0; }
  /** Called on touchdown with the downward speed, for squash. */
  land(impact: number) { this.landAmt = Math.min(0.28, impact * 0.018); this.landT = 0.2; }

  update(dt: number, p: BluPose) {
    this.t += dt; const t = this.t; const j = this.j;
    const run = p.grounded && !p.sliding && !p.charging && !p.celebrating ? p.speed : 0;
    this.phase += dt * (5 + 9 * p.speed);
    const s = Math.sin(this.phase), co = Math.cos(this.phase);
    // --- targets (radians) ---
    let bodyX = 0, bodyZ = 0, bob = 0, stretch = 1, shL = 0, shR = 0, shZL = 0.14, shZR = 0.14, elL = -0.25, elR = -0.25;
    let hipL = 0, hipR = 0, knL = 0.08, knR = 0.08, mouth = 0.55, open = 1, brow = 0, browY = 0, handTwistR = 0;
    // idle breathing + sway
    stretch = 1 + Math.sin(t * 2.4) * 0.018; shZL += Math.sin(t * 2.4) * 0.04; shZR += Math.sin(t * 2.4 + 0.5) * 0.04;
    if (run > 0.02) {
      const k = Math.min(1, run * 1.3);
      hipL = -s * 0.95 * k; hipR = s * 0.95 * k;
      knL = 0.15 + Math.max(0, co) * 1.45 * k; knR = 0.15 + Math.max(0, -co) * 1.45 * k;
      shL = s * 0.85 * k; shR = -s * 0.85 * k; elL = elR = -1.35 * k - 0.25 * (1 - k);
      bodyX = 0.2 * k; bodyZ = s * 0.06 * k; bob = Math.abs(co) * 0.09 * k; stretch = 1 + Math.abs(co) * 0.05 * k;
      mouth = 0.7; brow = 0.08;
    }
    if (!p.grounded) {
      if (p.vy > 0) { stretch = 1.12; hipL = -0.9; hipR = -0.15; knL = 1.4; knR = 0.5; shL = -2.5; shR = -2.3; shZL = shZR = 0.35; elL = elR = -0.2; mouth = 1; }
      else { stretch = 0.97; hipL = -0.35; hipR = 0.25; knL = 0.5; knR = 0.35; shL = shR = -0.4; shZL = shZR = 1.25; elL = elR = -0.4; mouth = 0.9; open = 1.1; }
    }
    if (this.flipT > 0) { hipL = hipR = -1.7; knL = knR = 2.1; shL = shR = -1.2; elL = elR = -1.6; shZL = shZR = 0.2; stretch = 0.92; mouth = 1.1; open = 0.55; }
    if (p.sliding) { bodyX = -0.95; bob = -0.34; hipL = hipR = -1.45; knL = knR = 0.2; shL = shR = 0.9; shZL = shZR = 0.65; elL = elR = -0.3; mouth = 0.9; open = 1.2; brow = -0.1; }
    if (p.dashing) { bodyX = 0.62; hipL = -0.3; hipR = 0.9; knL = 0.4; knR = 0.8; shL = shR = 1.25; shZL = shZR = 0.25; elL = elR = 0; stretch = 1.08; mouth = 0.4; brow = 0.3; }
    if (p.charging) { bodyX = 0.1; shL = shR = -1.45; shZL = shZR = 0.28; elL = elR = -0.15; knL = knR = 0.45; hipL = hipR = -0.35; bob = -0.08 + Math.sin(t * 40) * 0.012; bodyZ = Math.sin(t * 33) * 0.03; mouth = 0.3; open = 0.75; brow = 0.35; }
    if (p.celebrating) {
      const hop = Math.abs(Math.sin(t * 7.5)); bob = hop * 0.28; stretch = 1 + (hop - 0.5) * 0.12;
      shR = -1.2; shZR = 0.45; elR = -1.55; handTwistR = 1.2;                  // thumbs up
      shL = -0.2; shZL = 2.35 + Math.sin(t * 15) * 0.25; elL = -0.8;          // fist pump
      hipL = -0.25 * hop; hipR = 0.2 * hop; knL = knR = 0.4 * hop; mouth = 1.15; open = 0.45; brow = -0.25; browY = 0.04;
    }
    if (p.waving && !p.celebrating) {
      shR = -0.3; shZR = 2.55 + Math.sin(t * 9) * 0.28; elR = -0.35 + Math.sin(t * 9) * 0.25; mouth = 1; brow = -0.15; browY = 0.03;
    }
    if (p.overcharge) { mouth = Math.max(mouth, 1); brow = -0.2; }
    // landing squash
    if (this.landT > 0) { this.landT -= dt; const q = Math.sin((this.landT / 0.2) * Math.PI) * this.landAmt; stretch -= q; knL += q * 3; knR += q * 3; bob -= q * 0.5; }
    // blink + glance
    this.blinkIn -= dt; if (this.blinkIn <= 0) { this.blinkT = 0.14; this.blinkIn = 1.8 + Math.random() * 3.2; }
    if (this.blinkT > 0) { this.blinkT -= dt; open = Math.min(open, 0.08); }
    this.glanceIn -= dt; if (this.glanceIn <= 0) { this.glanceIn = 0.8 + Math.random() * 2.2; this.glanceTarget.set((Math.random() - 0.5) * 0.06, (Math.random() - 0.4) * 0.04); if (p.waving || p.celebrating) this.glanceTarget.set(0, 0.01); }
    this.glance.x = damp(this.glance.x, this.glanceTarget.x, 10, dt); this.glance.y = damp(this.glance.y, this.glanceTarget.y, 10, dt);

    // --- apply with smoothing ---
    const L = 16, set = (k: string, v: number, l = L) => (j[k] = damp(j[k] ?? v, v, l, dt));
    this.root.rotation.y = dampAngle(this.root.rotation.y, p.yaw, p.dashing ? 18 : 11, dt);
    this.body.rotation.x = set('bx', bodyX, 12); this.body.rotation.z = set('bz', bodyZ, 12);
    this.mover.position.y = set('bob', bob + (p.sliding ? 0 : 0), 20);
    const st = set('st', stretch, 22); this.body.scale.set(1 / Math.sqrt(st), st, 1 / Math.sqrt(st));
    const [aL, aR] = this.arms[0].side < 0 ? [this.arms[0], this.arms[1]] : [this.arms[1], this.arms[0]];
    aL.shoulder.rotation.x = set('shL', shL); aR.shoulder.rotation.x = set('shR', shR);
    aL.shoulder.rotation.z = -set('szL', shZL); aR.shoulder.rotation.z = set('szR', shZR);
    aL.elbow.rotation.x = set('eL', elL); aR.elbow.rotation.x = set('eR', elR); aR.hand.rotation.y = set('hR', handTwistR, 10);
    const [lL, lR] = this.legs[0].side < 0 ? [this.legs[0], this.legs[1]] : [this.legs[1], this.legs[0]];
    lL.hip.rotation.x = set('hL', hipL); lR.hip.rotation.x = set('hR2', hipR); lL.knee.rotation.x = set('kL', knL); lR.knee.rotation.x = set('kR', knR);
    lL.ankle.rotation.x = -j.hL * 0.3 - j.kL * 0.35; lR.ankle.rotation.x = -j.hR2 * 0.3 - j.kR * 0.35;
    // slide lowers hips with the body
    for (const leg of this.legs) leg.hip.position.y = 0.84 + (j.bob < 0 ? j.bob * 0.6 : 0);
    this.body.position.y = 0.8 + (p.sliding ? -0.08 : 0);
    const op = set('open', open, 30); this.eyes.forEach(e => { e.scale.y = op; });
    this.irises.forEach(ir => { ir.position.x = this.glance.x; ir.position.y = this.glance.y; });
    const bw = set('brow', brow, 12), by = set('browY', browY, 12);
    this.brows.forEach((b, i) => { const sd = i === 0 ? -1 : 1; b.children[0].rotation.x = 0; b.rotation.z = sd * -bw; b.position.y = 0.25 + by; });
    this.mouth.scale.y = set('mouth', mouth, 14); this.mouth.scale.x = 0.85 + j.mouth * 0.15;
    // front flip on double jump
    if (this.flipT > 0) { this.flipT = Math.max(0, this.flipT - dt); const k = 1 - this.flipT / 0.52; const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; this.mover.rotation.x = e * Math.PI * 2; this.mover.position.y += Math.sin(k * Math.PI) * 0.35; }
    else this.mover.rotation.x = 0;
    // overcharge glow
    const glow = p.overcharge ? 0.35 + Math.sin(t * 14) * 0.2 : p.charging ? 0.2 + Math.sin(t * 30) * 0.1 : 0;
    this.bodyMat.emissive.setHex(0x2aa8ff); this.bodyMat.emissiveIntensity = damp(this.bodyMat.emissiveIntensity, glow, 10, dt);
    this.backBolt.color.setHex(this.decalBars <= 1 ? 0xff5d73 : p.overcharge ? 0xffffff : 0x5ff4ff);
  }

  dispose() { this.disposables.forEach(d => d.dispose()); this.root.removeFromParent(); }
}


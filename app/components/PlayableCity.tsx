'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { getProgress, checkpointProgress, dispatchProgress, getSyncStatus } from '../../lib/progress-store';
import { unlockedLevel, cityScale, cityName } from '../../lib/levels';
import { BluRig, toon } from './BluRig';
import { completeLevel, exchangeCoins, upgradeDash, COINS_PER_BLU, DASH_COST_BLU, LEVELS, parseLevelProgress, SAVE_KEY, type LevelId } from '../../lib/levels';

type Lang = 'en' | 'he' | 'ar';
type Props = { lang: Lang; onMenu: () => void; onReward: () => void; serverRestored: boolean; challenge?:boolean };
const copy = {
  en: { zone: 'Central Grid', collect: 'Find 3 energy cells', generator: 'Run to the main generator', charge: 'Hold Charge to restore power', done: 'Power restored!', next: 'The Energy Tower is next', metro: 'Metro rush', metroCollect: 'Find 2 signal cores', metroStation: 'Run to the metro station', metroCharge: 'Hold Charge to start the metro', metroDone: 'Metro is running!', menu: 'Menu', jump: 'Jump', dash: 'Dash', interact: 'Charge', start: 'Stick to move · swipe up to jump', unsupported: 'This device can’t show the 3D city', resume: 'Open the city map', rail: 'Rail grind!', secret: 'Secret route!', pause: 'Paused', continue: 'Keep playing', overcharge: 'Overcharge!', tap: 'Tap to play', score: 'Score', city: 'City', flip: 'Flip!', cell: 'Energy cell!', core: 'Signal core!' },
  he: { zone: 'Central Grid', collect: 'מצא 3 תאי אנרגיה', generator: 'רוץ לגנרטור הראשי', charge: 'החזק טעינה כדי להחזיר חשמל', done: 'החשמל חזר!', next: 'מגדל האנרגיה הבא בתור', metro: 'מרוץ המטרו', metroCollect: 'מצא 2 ליבות איתות', metroStation: 'רוץ לתחנת המטרו', metroCharge: 'החזק טעינה להפעלת המטרו', metroDone: 'המטרו נוסע!', menu: 'תפריט', jump: 'קפיצה', dash: 'דאש', interact: 'טעינה', start: 'ג׳ויסטיק לתנועה · החלק למעלה לקפיצה', unsupported: 'המכשיר הזה לא יכול להציג את העיר בתלת־ממד', resume: 'פתח את מפת העיר', rail: 'גלישה על המסילה!', secret: 'דרך סודית!', pause: 'הפסקה', continue: 'ממשיכים לשחק', overcharge: 'טעינת יתר!', tap: 'לחץ כדי לשחק', score: 'ניקוד', city: 'עיר', flip: 'סלטה!', cell: 'תא אנרגיה!', core: 'ליבת איתות!' },
  ar: { zone: 'Central Grid', collect: 'اجمع 3 خلايا طاقة', generator: 'اركض للمولّد الرئيسي', charge: 'اضغط مطولًا لترجع الكهربا', done: 'رجعت الكهربا!', next: 'برج الطاقة هو الجاي', metro: 'سباق المترو', metroCollect: 'اجمع نواتين للإشارة', metroStation: 'اركض لمحطة المترو', metroCharge: 'اضغط مطولًا لتشغيل المترو', metroDone: 'المترو ماشي!', menu: 'القائمة', jump: 'اقفز', dash: 'اندفاع', interact: 'شحن', start: 'العصا للحركة · اسحب لفوق للقفز', unsupported: 'هالجهاز ما بقدر يعرض المدينة 3D', resume: 'افتح خريطة المدينة', rail: 'تزحلق على السكة!', secret: 'طريق سري!', pause: 'توقف', continue: 'كمّل لعب', overcharge: 'طاقة خارقة!', tap: 'اضغط لتلعب', score: 'النقاط', city: 'مدينة', flip: 'شقلبة!', cell: 'خلية طاقة!', core: 'نواة إشارة!' },
};
type Status = { extraGot:number; levelDone:boolean; runTime:number; runDone:boolean; cells: number; metroCells: number; energy: number; meters: number; direction: number; restored: boolean; metroDone: boolean; level: LevelId; coins: number; blu: number; dashLevel: number; celebrating: boolean; nearby: boolean; overcharge: boolean; rail: boolean; secret: boolean; charge: number; dashing: boolean; score: number; bolts: number; tutorial: boolean };
const PALETTE = [0xff7b8e, 0x4fd6c8, 0xffc94d, 0x8b8cff, 0xff9f5a, 0x6fd3ff, 0xc98bff];

export default function PlayableCity({ lang, onMenu, onReward, serverRestored, challenge=false }: Props) {
  const host = useRef<HTMLDivElement>(null); const fx = useRef<HTMLDivElement>(null); const knob = useRef<HTMLSpanElement>(null); const boltChip = useRef<HTMLDivElement>(null);
  const input = useRef({ x: 0, y: 0, jump: false, dash: false, slide: false, charge: false, start: false, next: false, exchange: false, upgrade: false });
  const callbacks = useRef({ onReward }); callbacks.current.onReward = onReward;
  const [unsupported, setUnsupported] = useState(false); const [paused, setPaused] = useState(false); const pausedRef = useRef(false); pausedRef.current = paused;
  const [started, setStarted] = useState(false); const startedRef = useRef(false);
  const [status, setStatus] = useState<Status>({ extraGot:0,levelDone:false,runTime:0,runDone:false,cells: 0, metroCells: 0, energy: 0, meters: 0, direction: 0, restored: false, metroDone: false, level: 1, coins: 0, blu: 0, dashLevel: 0, celebrating: false, nearby: false, overcharge: false, rail: false, secret: false, charge: 0, dashing: false, score: 0, bolts: 0, tutorial: true });
  const t = copy[lang]; const tRef = useRef(t); tRef.current = t;
  const city=getProgress().cityLevel;
  const cityLabel=`Level ${city} · ${cityName(city,lang)}`;
  const ui = {
    en: { level: 'MISSION', coins: 'COINS', reward: 'LEVEL COMPLETE · +', next: 'Continue to Level 2', locked: 'Complete Level 1 to unlock', local: 'Progress saved on this device', exchange: 'Exchange 100 Coin → 1 BLU', upgrade: 'Upgrade dash · 2 BLU', dash: 'Dash upgrade' },
    he: { level: 'משימה', coins: 'מטבעות', reward: 'השלב הושלם · +', next: 'המשך לשלב 2', locked: 'יש להשלים את שלב 1', local: 'ההתקדמות נשמרת במכשיר הזה', exchange: 'המר 100 Coin ל־1 BLU', upgrade: 'שדרג דאש · 2 BLU', dash: 'שדרוג דאש' },
    ar: { level: 'مهمة', coins: 'العملات', reward: 'اكتملت المرحلة · +', next: 'تابع إلى المرحلة 2', locked: 'أكمل المرحلة 1 أولاً', local: 'يُحفظ التقدم على هذا الجهاز', exchange: 'حوّل 100 Coin إلى 1 BLU', upgrade: 'طوّر الاندفاع · 2 BLU', dash: 'تطوير الاندفاع' },
  }[lang];
  const begin = () => { if (startedRef.current) return; startedRef.current = true; setStarted(true); };

  useEffect(() => {
    const mount = host.current; if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); } catch { setUnsupported(true); return; }
    const scene = new THREE.Scene(); const FOG = 0xffbe9c; scene.fog = new THREE.Fog(FOG, 40, 150);
    const camera = new THREE.PerspectiveCamera(62, 1, .1, 400);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
    renderer.domElement.className = 'play-canvas'; mount.append(renderer.domElement);
    const disposables: { dispose: () => void }[] = [];
    const mats = new Map<string, THREE.Material>();
    const T = (color: number, glow = 0, gi = 0) => { const k = `${color}-${glow}-${gi}`; let mm = mats.get(k); if (!mm) { mm = toon(color, glow, gi); mats.set(k, mm); } return mm; };
    const B = (color: number) => { const k = `b${color}`; let mm = mats.get(k); if (!mm) { mm = new THREE.MeshBasicMaterial({ color }); mats.set(k, mm); } return mm; };
    const boxGeo = new THREE.BoxGeometry(1, 1, 1), cylGeo = new THREE.CylinderGeometry(1, 1, 1, 14), sphGeo = new THREE.SphereGeometry(1, 16, 12); disposables.push(boxGeo, cylGeo, sphGeo);
    const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) => { const m = new THREE.Mesh(boxGeo, mat); m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); return m; };
    const cyl = (r: number, h: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) => { const m = new THREE.Mesh(cylGeo, mat); m.scale.set(r, h, r); m.position.set(x, y, z); parent.add(m); return m; };
    const ball = (r: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) => { const m = new THREE.Mesh(sphGeo, mat); m.scale.setScalar(r); m.position.set(x, y, z); parent.add(m); return m; };

    // Sky: golden-hour gradient dome, sun and drifting clouds
    const skyGeo = new THREE.SphereGeometry(300, 32, 16); const cols: number[] = []; const pos = skyGeo.attributes.position; const top = new THREE.Color(0x3f5cff), mid = new THREE.Color(0x9d86ff), low = new THREE.Color(0xffb690), tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 300; if (y > .25) tmp.copy(mid).lerp(top, Math.min(1, (y - .25) / .6)); else tmp.copy(low).lerp(mid, Math.max(0, y / .25)); cols.push(tmp.r, tmp.g, tmp.b); }
    skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }); disposables.push(skyGeo, skyMat);
    const sky = new THREE.Mesh(skyGeo, skyMat); scene.add(sky);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff0b5, fog: false }); disposables.push(sunMat); const sun = new THREE.Mesh(new THREE.CircleGeometry(16, 40), sunMat); sun.position.set(-30, 26, -250); scene.add(sun);
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffe9f0, fog: false, transparent: true, opacity: .92 }); disposables.push(cloudMat);
    const clouds = [0, 1, 2, 3, 4].map(i => { const g = new THREE.Group(); [[0, 0, 5], [5, -1, 4], [-5, -1.3, 3.6], [2, 2, 3.8]].forEach(([x, y, r]) => { const m = new THREE.Mesh(sphGeo, cloudMat); m.scale.set(r, r * .6, r * .8); m.position.set(x, y, 0); g.add(m); }); g.position.set(-80 + i * 42, 50 + (i % 2) * 14, -170 - (i % 3) * 20); scene.add(g); return g; });

    scene.add(new THREE.HemisphereLight(0xfff1e6, 0x6c5ce7, 1.6));
    const sunLight = new THREE.DirectionalLight(0xffe0bd, 2.1); sunLight.position.set(-18, 30, 14); scene.add(sunLight);

    // Streets
    box(120, .4, 170, T(0x7bd88f), 0, -.3, -36);
    box(31, .06, 110, T(0x3f4470), 0, -.07, -30);
    for (const z of [-16, -36]) { box(80, .07, 8, T(0x3f4470), 0, -.04, z); for (let x = -36; x < 36; x += 3) box(1.2, .08, .9, B(0xffffff), x, -.02, z + 2.2); }
    for (const x of [-16, 16]) { box(.5, .26, 110, T(0xfff3e0), x, .05, -30); box(4, .1, 110, T(0xe8d9ff), x + Math.sign(x) * 2.3, -.02, -30); }
    for (let z = 12; z > -75; z -= 5.5) box(.22, .03, 2.4, B(0xffd43b), 0, -.02, z);
    for (const x of [-7.7, 7.7]) for (let z = 12; z > -75; z -= 5.5) box(.12, .03, 2.4, B(0xffffff), x, -.02, z);

    // Buildings: saturated toon blocks with ink rooftops; window grid is one instanced mesh
    const winCount = 900; const winGeo = new THREE.PlaneGeometry(.9, 1); const winMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); disposables.push(winGeo, winMat);
    const windowsMesh = new THREE.InstancedMesh(winGeo, winMat, winCount); let wi = 0; const dummy = new THREE.Object3D(); const unlitColor = new THREE.Color(0x3b3474), litColor = new THREE.Color(0xffe27a);
    const addWindow = (x: number, y: number, z: number, ry: number) => { if (wi >= winCount) return; dummy.position.set(x, y, z); dummy.rotation.set(0, ry, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); windowsMesh.setMatrixAt(wi, dummy.matrix); windowsMesh.setColorAt(wi, unlitColor); wi++; };
    const signs: THREE.Mesh[] = [];
    for (const side of [-1, 1]) for (let i = 0; i < 13; i++) {
      const x = side * (24 + (i % 3) * .8), z = 12 - i * 6.9, h = 8 + ((i * 7 + (side + 1) * 5) % 6) * 3, color = PALETTE[(i + (side > 0 ? 3 : 0)) % PALETTE.length];
      box(6.2, h, 5.6, T(color), x, h / 2, z); box(6.8, .6, 6.2, T(0x2b2f5e), x, h + .3, z); box(5.4, .3, 4.8, T(0xfff3e0), x, h + .7, z);
      if (i % 2) { box(1.4, 1, 1.4, T(0xdfe6ff), x + 1.5, h + 1.3, z - 1); cyl(.35, 1.4, T(0x9aa3c7), x - 1.6, h + 1.3, z + 1); }
      const face = x - side * 3.11;
      for (let y = 2.2; y < h - 1; y += 2.6) for (let dz = -1.7; dz <= 1.7; dz += 1.7) addWindow(face, y, z + dz, -side * Math.PI / 2);
      box(.2, 1.2, 5.8, T(0x2b2f5e), face - side * .05, 1.1, z);
      if (i % 3 === 1) { const s = box(.25, 1.6, 3.4, T(0x5b4d8a), face - side * .2, Math.min(h - 2, 6), z); signs.push(s); }
    }
    for (const side of [-1, 1]) for (let i = 0; i < 8; i++) { const h = 22 + (i * 11) % 18; box(9, h, 9, T(PALETTE[(i + 2) % PALETTE.length]), side * 36, h / 2, 8 - i * 12); box(9.6, .8, 9.6, T(0x2b2f5e), side * 36, h + .4, 8 - i * 12); }
    windowsMesh.count = wi; windowsMesh.instanceMatrix.needsUpdate = true; if (windowsMesh.instanceColor) windowsMesh.instanceColor.needsUpdate = true; scene.add(windowsMesh);
    // Street furniture
    const lamps: THREE.Mesh[] = [];
    for (const side of [-1, 1]) for (let z = 10; z > -70; z -= 13) { cyl(.1, 4.2, T(0x2b2f5e), side * 16.6, 2.1, z); box(1.1, .12, .25, T(0x2b2f5e), side * 16.1, 4.2, z); lamps.push(ball(.32, T(0x6b6590), side * 15.6, 4.05, z)); }
    for (const side of [-1, 1]) for (let z = 4; z > -70; z -= 11) { cyl(.18, 1.4, T(0x8a5a3c), side * 19, .7, z); ball(1.3, T(0x3fbf6a), side * 19, 2.3, z); ball(.9, T(0x62d98a), side * 19 + .4, 3.1, z + .2); }
    // Elevated rail + launch pad
    box(2.4, .5, 73, T(0x5b6bd6), -9.2, 5.2, -31); for (let z = 0; z > -66; z -= 9) cyl(.3, 5.1, T(0xfff3e0), -9.2, 2.6, z);
    for (const x of [-9.85, -8.55]) box(.14, .12, 73, B(0xffd43b), x, 5.5, -31);
    const pad = cyl(1, .16, T(0xff4fa3, 0xff4fa3, .6), -9.2, .1, -5); const padRing = new THREE.Mesh(new THREE.TorusGeometry(1.25, .08, 8, 30), B(0xffffff)); padRing.rotation.x = Math.PI / 2; padRing.position.set(-9.2, .25, -5); scene.add(padRing); disposables.push(padRing.geometry);
    const train = new THREE.Group(); box(2.6, 2.2, 7, T(0xff5d73), 0, 0, 0, train); box(2.7, .8, 6.6, T(0xfff3e0), 0, .35, 0, train); for (const z of [-2.2, 0, 2.2]) box(2.75, .6, 1.3, T(0x6fd3ff), 0, .4, z, train); box(2.7, .25, 7.1, T(0x2b2f5e), 0, -1.1, 0, train); train.position.set(-9.2, 6.7, -65); scene.add(train);
    const drones = [0, 1, 2].map(i => { const g = new THREE.Group(); box(.9, .3, .8, T(0xfff3e0), 0, 0, 0, g); box(1.9, .06, .18, T(0x2b2f5e), 0, .1, 0, g); ball(.18, B(0x6ff7ff), 0, -.2, .3, g); g.position.set(i % 2 ? 8 : -8, 9 + i * 2, -11 - i * 15); scene.add(g); return g; });
    const traffic = [0, 1, 2].map(i => { const g = new THREE.Group(); const c = [0xffc94d, 0x4fd6c8, 0xff7b8e][i]; box(1.7, .7, 3.2, T(c), 0, .55, 0, g); box(1.4, .55, 1.6, T(0xdff6ff), 0, 1.15, -.2, g); box(1.3, .2, .12, B(0xfff3b0), 0, .6, -1.62, g); for (const [x, z] of [[-.8, 1], [.8, 1], [-.8, -1], [.8, -1]]) { const w = cyl(.35, .3, T(0x2b2f5e), x, .35, z, g); w.rotation.z = Math.PI / 2; } g.position.set(i === 1 ? -4 : 4, 0, 9 - i * 20); scene.add(g); return g; });
    box(11, 6.5, 8, T(0xc98bff), 39, 3.2, -28); box(11.6, .5, 8.6, T(0xff4fa3), 39, 6.7, -28);
    const tower = new THREE.Group(); cyl(4, 40, T(0x5b6bd6), 0, 20, -110, tower); cyl(3, 7, T(0x2b2f5e), 0, 43, -110, tower); const towerTop = cyl(2.2, 6, T(0x6b6590), 0, 49, -110, tower); cyl(.4, 14, T(0xfff3e0), 0, 58, -110, tower); scene.add(tower);
    const gen = new THREE.Group(); cyl(3, .8, T(0x2b2f5e), 0, .45, -35, gen); cyl(1.6, 4, T(0xfff3e0), 0, 2.8, -35, gen); for (let k = 0; k < 4; k++) { const b = box(.3, 3.6, .3, T(0x5b6bd6), Math.cos(k * 1.57) * 1.65, 2.8, -35 + Math.sin(k * 1.57) * 1.65, gen); b.rotation.y = k; } const genCore = cyl(1.2, .5, T(0x6b6590), 0, 5, -35, gen); scene.add(gen);
    const genRing = new THREE.Mesh(new THREE.TorusGeometry(4, .12, 8, 48), B(0x6ff7ff)); genRing.rotation.x = Math.PI / 2; genRing.position.set(0, .2, -35); scene.add(genRing); disposables.push(genRing.geometry);
    // Objectives
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x6ff7ff, transparent: true, opacity: .22, depthWrite: false, blending: THREE.AdditiveBlending }); const beamPink = beamMat.clone(); beamPink.color.setHex(0xff7ad0); disposables.push(beamMat, beamPink);
    const beamGeo = new THREE.CylinderGeometry(.25, .9, 16, 12, 1, true); const crystalGeo = new THREE.OctahedronGeometry(.8); const coreGeo = new THREE.IcosahedronGeometry(.75); disposables.push(beamGeo, crystalGeo, coreGeo);
    const makeObjective = (x: number, z: number, geo: THREE.BufferGeometry, color: number, beam: THREE.Material) => { const g = new THREE.Group(); const gem = new THREE.Mesh(geo, T(color, color, .55)); gem.position.y = 1.9; g.add(gem); const ring = new THREE.Mesh(new THREE.TorusGeometry(1, .08, 6, 28), B(0xffffff)); ring.rotation.x = Math.PI / 2; ring.position.y = .15; g.add(ring); disposables.push(ring.geometry); const b = new THREE.Mesh(beamGeo, beam); b.position.y = 8; g.add(b); g.position.set(x, 0, z); scene.add(g); return g; };
    const cells = [[-11, -8], [12, -23], [-4, -43]].map(([x, z]) => makeObjective(x, z, crystalGeo, 0x49e6ff, beamMat));
    const metroStation = new THREE.Group(); box(7.4, .35, 4.4, T(0xfff3e0), 0, .2, 0, metroStation); for (const x of [-3.2, 3.2]) cyl(.22, 4, T(0x5b6bd6), x, 2.1, 0, metroStation); box(8, .4, 4.8, T(0xff5d73), 0, 4.2, 0, metroStation); const stationSign = box(6.4, .9, .3, T(0x6b6590), 0, 3.5, 2.3, metroStation); metroStation.position.set(-9, 0, -50); scene.add(metroStation);
    const metroCores = [[-13, -44], [11, -49]].map(([x, z]) => { const g = makeObjective(x, z, coreGeo, 0xff5fc8, beamPink); g.visible = false; return g; });

    // Connected alley, accessible rooftop route and the power district.
    const surfaces=[{x:8,z:-18,w:5,d:5,y:3},{x:8,z:-26,w:5,d:6,y:4},{x:8,z:-35,w:5,d:6,y:4},{x:4,z:-41,w:10,d:5,y:3}];
    for(const roof of surfaces){box(roof.w,roof.y,roof.d,T(0x465994),roof.x,roof.y/2,roof.z);box(roof.w+.2,.16,roof.d+.2,T(0xdcecff),roof.x,roof.y+.08,roof.z);}
    const roofPad=cyl(1,.16,T(0x6ff7ff,0x6ff7ff,.6),8,.1,-12);
    const boulevardMat=T(0x304965) as THREE.MeshToonMaterial;box(30,.06,8,boulevardMat,16,-.01,-36);box(25,.06,36,T(0x29344e),12,-.01,-78);
    box(8,4,6,T(0x336a86),27,2,-36);const shopLight=box(7,.7,.2,T(0x344252),27,3.3,-32.8);
    const workshop=box(7,3.8,6,T(0x584363),24,1.9,-57);const workshopLight=box(6,.7,.2,T(0x344252),24,3,-53.8);
    const gate=box(20,5,.5,T(0x25374c),12,2.5,-66);const districtLamp=box(18,.3,.7,T(0x344252),12,5.2,-66);
    const factory=box(10,10,8,T(0x446274),12,5,-86);cyl(1,12,T(0x9aacbf),19,6,-87);
    const powerNodes=[[-8,-73],[12,-79],[27,-89]];
    const extra:Record<number,THREE.Group[]>={
      3:[[17,-16],[17,-25],[17,-42]].map(([x,z])=>makeObjective(x,z,crystalGeo,0xffcf45,beamMat)),
      4:[[8,-18],[8,-26],[8,-35]].map(([x,z],i)=>{const o=makeObjective(x,z,coreGeo,0xff5fc8,beamPink);o.position.y=surfaces[i].y;return o;}),
      5:[[14,-47],[29,-50]].map(([x,z])=>makeObjective(x,z,coreGeo,0x92ffaa,beamMat)),
      6:powerNodes.map(([x,z])=>makeObjective(x,z,crystalGeo,0x6ff7ff,beamMat))};
    const terminals:Record<number,THREE.Vector3>={3:new THREE.Vector3(17,0,-31),4:new THREE.Vector3(4,3,-41),5:new THREE.Vector3(24,0,-52),6:new THREE.Vector3(12,0,-63)};
    const terminalRings:Record<number,THREE.Mesh>={};for(const id of [3,4,5,6]){const ring=new THREE.Mesh(new THREE.TorusGeometry(2,.1,8,32),B(0x6ff7ff));ring.rotation.x=Math.PI/2;ring.position.copy(terminals[id]).add(new THREE.Vector3(0,.2,0));scene.add(ring);terminalRings[id]=ring;disposables.push(ring.geometry);}
    const mechanic=new THREE.Group();box(.7,1.1,.55,T(0xffcf45),0,.65,0,mechanic);ball(.3,T(0xe4f9ff),0,1.45,0,mechanic);mechanic.position.set(29,0,-50);scene.add(mechanic);
    let escort=false,extraCelebrate=0,runDone=false;const runFinish=new THREE.Vector3(0,0,-50);
    // Collectible bolts: gold lightning shapes, instanced (Subway Surfers coin lines)
    const bs = new THREE.Shape(); bs.moveTo(.1, .5); bs.lineTo(-.26, -.02); bs.lineTo(-.02, -.02); bs.lineTo(-.12, -.5); bs.lineTo(.27, .08); bs.lineTo(.03, .08); bs.lineTo(.1, .5);
    const boltGeo = new THREE.ExtrudeGeometry(bs, { depth: .12, bevelEnabled: true, bevelThickness: .04, bevelSize: .04, bevelSegments: 1 }); boltGeo.center(); disposables.push(boltGeo);
    const boltSpots: THREE.Vector3[] = [];
    const line = (x: number, z0: number, n: number, y = .9, dz = -2.2, arc = 0) => { for (let k = 0; k < n; k++) boltSpots.push(new THREE.Vector3(x, y + (arc ? Math.sin((k / (n - 1)) * Math.PI) * arc : 0), z0 + k * dz)); };
    line(0, 4, 6); line(-5, -2, 5); line(5, -12, 6); line(-9.2, -2, 6, .9, -2.2, 3.4); line(-9.2, -16, 14, 6.3); line(9, -26, 6); line(-3, -30, 5); line(4, -40, 6); line(-13, -38, 4); line(0, -46, 4, .9, -1.8, 2.5);
    const boltMesh = new THREE.InstancedMesh(boltGeo, T(0xffc629, 0xffa600, .45), boltSpots.length); scene.add(boltMesh);
    const boltTaken = boltSpots.map(() => false);

    // Particle bursts
    const partGeo = new THREE.IcosahedronGeometry(.13, 0); disposables.push(partGeo);
    const parts = Array.from({ length: 70 }, () => { const m = new THREE.Mesh(partGeo, B(0xffffff)); m.visible = false; scene.add(m); return { m, v: new THREE.Vector3(), life: 0 }; });
    let pIndex = 0; const burst = (at: THREE.Vector3, color: number, n: number, force = 5, up = 4) => { for (let k = 0; k < n; k++) { const p = parts[pIndex++ % parts.length]; p.m.material = B(color); p.m.visible = true; p.m.position.copy(at); p.v.set((Math.random() - .5) * force, Math.random() * up + 1, (Math.random() - .5) * force); p.life = .55 + Math.random() * .35; p.m.scale.setScalar(.7 + Math.random() * .8); } };

    // BLU
    const blu = new BluRig(); scene.add(blu.root); disposables.push(blu);
    const trail = [0, 1, 2, 3, 4].map(() => { const o = new THREE.Mesh(sphGeo, B(0x6ff7ff)); o.scale.setScalar(.12); scene.add(o); return o; });

    // Checkpoint
    for(const r of [{x:8,a:-10,b:-15,ya:0,yb:3},{x:8,a:-20.5,b:-22.5,ya:3,yb:4},{x:8,a:-29,b:-31.5,ya:4,yb:4},{x:8,a:-38,b:-39,ya:4,yb:3}]){const ramp=box(2.5,.18,Math.hypot(r.a-r.b,r.yb-r.ya),T(0xffcf45),r.x,(r.ya+r.yb)/2,(r.a+r.b)/2);ramp.rotation.x=Math.atan2(r.yb-r.ya,r.a-r.b);}
    let progress = getProgress();
    const worldScale=cityScale(progress.cityLevel);
    const world=new THREE.Group();for(const child of [...scene.children])if(child!==sky&&child!==sun&&!clouds.includes(child as THREE.Group)&&!(child instanceof THREE.Light))world.add(child);scene.add(world);world.scale.set(worldScale,1,worldScale);
    // The robot remains human sized while the city footprint grows.
    blu.root.scale.set(1/worldScale,1,1/worldScale);
    const found = [...progress.cells]; let restored = progress.completed.includes(1) || serverRestored;
    const metroFound = [...progress.metro]; let metroDone = progress.metroDone;
    let activeLevel: LevelId = unlockedLevel(progress);
    // Complete older saves without granting a new reward for a mission finished before coins existed.
    if (restored && !progress.claimed.includes(1)) progress = { ...progress, restored: true, claimed: [...progress.claimed, 1] };
    if (metroDone && !progress.claimed.includes(2)) progress = { ...progress, claimed: [...progress.claimed, 2] };
    const save = () => { progress=checkpointProgress({...progress,cells:found,restored:progress.restored,metro:metroFound,metroDone}); };
    const award = (id: LevelId) => { save();progress=dispatchProgress({type:"finish",id}); };
    cells.forEach((c, i) => { c.visible = !found[i]; }); metroCores.forEach((c, i) => { c.visible = activeLevel === 2 && !metroFound[i]; });
    const litMats = { lamp: B(0xfff3b0), sign: T(0xff4fa3, 0xff4fa3, 1), core: B(0x6ff7ff), station: T(0x6ff7ff, 0x6ff7ff, .9) };
    let litWindows = 0; const lightWindow = (i: number) => { windowsMesh.setColorAt(i, litColor); };
    const applyLights = (instant: boolean) => { genCore.material = litMats.core; towerTop.material = litMats.core; if (instant) { const goal=Math.floor(wi*progress.completed.length/6);for (let i = 0; i < goal; i++) lightWindow(i); litWindows = goal; if (windowsMesh.instanceColor) windowsMesh.instanceColor.needsUpdate = true; lamps.forEach((l,i) => { if(i<lamps.length*progress.completed.length/6)l.material = litMats.lamp; }); signs.forEach((s,i) => { if(i<signs.length*progress.completed.length/6)s.material = litMats.sign; }); } };
    if (restored) applyLights(true);if(challenge){genRing.visible=false;} if (metroDone) stationSign.material = litMats.station;

    const state = { pos: new THREE.Vector3(0, 0, 10), vy: 0, jumps: 0, speed: 0, energy: restored ? 65 : 0, dash: 0, slide: 0, over: 0, charge: 0, time: 0, lastHud: 0, restoreTime: 0, metroTime: 0, padReady: true, airborne: false, idle: 0, yaw: 0, shake: 0, bolts: 0, travelled: 0, onRail: false, railShown: false, secretShown: false };
    let hitCooldown=0;
    const key = new Set<string>();
    const down = (e: KeyboardEvent) => { key.add(e.code); if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); if (!startedRef.current && (e.code === 'Space' || e.code === 'Enter')) { input.current.start = true; return; } if (e.code === 'Space') input.current.jump = true; if (e.code === 'ShiftLeft') input.current.dash = true; if (e.code === 'ControlLeft' || e.code === 'KeyC') input.current.slide = true; if (e.code === 'KeyE') input.current.charge = true; };
    const up = (e: KeyboardEvent) => { key.delete(e.code); if (e.code === 'KeyE') input.current.charge = false; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    const size = { w: 1, h: 1 };
    const resize = new ResizeObserver(() => { const w = mount.clientWidth, h = mount.clientHeight; if (!w || !h) return; size.w = w; size.h = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < .7 ? 70 : 62; camera.updateProjectionMatrix(); }); resize.observe(mount);
    // Floating text popups projected from world space
    const popup = (text: string, at: THREE.Vector3, kind = '') => { const layer = fx.current; if (!layer) return; const v = at.clone().project(camera); const el = document.createElement('div'); el.className = `pop ${kind}`; el.textContent = text; el.style.left = `${(v.x + 1) / 2 * size.w}px`; el.style.top = `${(1 - v.y) / 2 * size.h}px`; layer.append(el); el.addEventListener('animationend', () => el.remove()); };
    const pulseBolts = () => { const el = boltChip.current; if (!el) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); };

    let last = performance.now(); let frame = 0; const camPos = new THREE.Vector3(1.2, 2, 15.4); const look = new THREE.Vector3(0, 1.3, 10); const tmpV = new THREE.Vector3();
    const publish = () => {
      const remaining = challenge?[]:activeLevel === 1 ? cells.filter((_, i) => !found[i]) : activeLevel===2?metroCores.filter((_, i) => !metroFound[i]):(extra[activeLevel]||[]).filter((_,i)=>!progress.objectives[activeLevel][i]);
      const target = remaining.length ? remaining.reduce((best, c) => c.position.distanceTo(state.pos) < best.position.distanceTo(state.pos) ? c : best).position : challenge?runFinish:activeLevel === 1 ? new THREE.Vector3(0, 0, -35) : activeLevel===2?new THREE.Vector3(-9, 0, -50):terminals[activeLevel];
      const dx = target.x - state.pos.x, dz = target.z - state.pos.z;
      setStatus({extraGot:progress.objectives[activeLevel].filter(Boolean).length,levelDone:progress.completed.includes(activeLevel),runTime:Math.round(state.time),runDone,cells: found.filter(Boolean).length, metroCells: metroFound.filter(Boolean).length, energy: Math.round(state.energy), meters: Math.round(Math.hypot(dx, dz)*worldScale), direction: Math.atan2(dx, -dz), restored, metroDone, level: activeLevel, coins: progress.coins, blu: progress.blu, dashLevel: progress.dashLevel, celebrating: (extraCelebrate>0&&state.time-extraCelebrate<3.6)|| (state.restoreTime > 0 && state.time - state.restoreTime < 3.6) || (state.metroTime > 0 && state.time - state.metroTime < 3.6), nearby: challenge?state.pos.distanceTo(runFinish)<4:activeLevel>2?state.pos.distanceTo(terminals[activeLevel])<4:activeLevel === 2 ? Math.hypot(state.pos.x + 9, state.pos.z + 50) < 4.2 : Math.hypot(state.pos.x, state.pos.z + 35) < 4.2, overcharge: state.over > 0, rail: state.onRail, secret: state.pos.x > 13 && state.pos.z < -23, charge: state.charge, dashing: state.dash > 0, score: Math.round(state.bolts * 10 + state.travelled), bolts: state.bolts, tutorial: startedRef.current && state.travelled < 6 });
    };
    const animate = () => {
      frame = requestAnimationFrame(animate); const now = performance.now(); const dt = Math.min((now - last) / 1000, .04); last = now;
      if (input.current.exchange) { input.current.exchange = false; progress=dispatchProgress({type:"exchange"});publish(); }
      if (input.current.upgrade) { input.current.upgrade = false; progress=dispatchProgress({type:"dash"});publish(); }
      if (document.hidden || pausedRef.current) return; state.time += dt; const control = input.current; const playing = startedRef.current;
      if (control.start) { control.start = false; startedRef.current = true; setStarted(true);if(challenge){progress=dispatchProgress({type:"run-start"});state.time=0;state.bolts=0;} }
      if (control.next && progress.completed.includes(activeLevel)) { control.next = false; if(activeLevel<6)activeLevel=(activeLevel+1) as LevelId; else {progress=dispatchProgress({type:'next-city'});onMenu();return;} metroCores.forEach((c, i) => { c.visible = activeLevel===2&&!metroFound[i]; });state.charge = 0;publish(); }
      let horizontal = 0, forward = 0;
      if (playing) {
        horizontal = THREE.MathUtils.clamp(control.x + Number(key.has('KeyD') || key.has('ArrowRight')) - Number(key.has('KeyA') || key.has('ArrowLeft')), -1, 1);
        forward = THREE.MathUtils.clamp(-control.y + Number(key.has('KeyW') || key.has('ArrowUp')) - Number(key.has('KeyS') || key.has('ArrowDown')), -1, 1);
        if (control.dash && state.dash <= 0 && state.energy >= 12) { state.dash = .34 + progress.dashLevel * .1; state.energy -= 12; state.shake = .15; }
        if (control.slide && state.pos.y < .1) state.slide = .6;
        if (control.jump && state.jumps < 2) { state.vy = state.jumps ? 9.5 : 10.8; state.jumps++; state.airborne = true; blu.jump(state.jumps === 2); if (state.jumps === 2) popup(tRef.current.flip, tmpV.copy(state.pos).setY(state.pos.y + 3), 'small'); }
      }
      control.dash = false; control.slide = false; control.jump = false;
      state.dash = Math.max(0, state.dash - dt); state.slide = Math.max(0, state.slide - dt); state.over = Math.max(0, state.over - dt);
      const rail = Math.abs(state.pos.x + 9.2) < 1.2 && state.pos.z < -4 && state.pos.z > -65;
      const move = new THREE.Vector3(horizontal, 0, -forward); const mag = Math.min(1, move.length()); if (mag > 0) move.normalize();
      progress=getProgress();
      const targetSpeed = (state.dash > 0 ? 21 : state.over > 0 ? 14.5 : state.onRail ? 13 : progress.inventory.includes('shoes')?10.35:9) * (state.dash > 0 ? 1 : mag);
      state.speed = THREE.MathUtils.damp(state.speed, targetSpeed, 9, dt);
      const dir = state.dash > 0 && mag < .1 ? new THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw)) : move;
      const before = state.pos.clone();
      state.pos.x = THREE.MathUtils.clamp(state.pos.x + dir.x * state.speed * dt/worldScale, -17, 32); state.pos.z = THREE.MathUtils.clamp(state.pos.z + dir.z * state.speed * dt/worldScale, -96, 18);
      if(activeLevel<6&&state.pos.z < -62)state.pos.z=-62;
      state.travelled += Math.hypot(state.pos.x - before.x, state.pos.z - before.z) * .5;
      const onPad = Math.hypot(state.pos.x + 9.2, state.pos.z + 5) < 1.1; if (onPad && state.pos.y < .15 && state.padReady && playing) { state.vy = 17; state.jumps = 1; state.padReady = false; state.airborne = true; blu.jump(false); burst(tmpV.set(-9.2, .3, -5), 0xff4fa3, 14, 6, 6); } if (!onPad&&Math.hypot(state.pos.x-8,state.pos.z+12)>1.2) state.padReady = true;
      // A continuous rooftop route is accessible without perfectly timed double jumps.
      const ramps=[{x:8,a:-10,b:-15,ya:0,yb:3},{x:8,a:-20.5,b:-22.5,ya:3,yb:4},{x:8,a:-29,b:-31.5,ya:4,yb:4},{x:8,a:-38,b:-39,ya:4,yb:3}];
      for(const r of ramps){if(Math.abs(state.pos.x-r.x)<1.25&&state.pos.z<=r.a&&state.pos.z>=r.b-.6){const y=THREE.MathUtils.lerp(r.ya,r.yb,Math.min(1,(r.a-state.pos.z)/(r.a-r.b)));if(state.pos.y>=y-.65&&state.pos.y<=y+.3&&state.vy<=0){state.pos.y=y;state.vy=0;state.jumps=0;}}}
      const vyBefore = state.vy; state.vy -= 28 * dt; state.pos.y = Math.max(0, state.pos.y + state.vy * dt);
      for(const roof of surfaces){if(Math.abs(state.pos.x-roof.x)<roof.w/2+.2&&Math.abs(state.pos.z-roof.z)<roof.d/2+.2){if(state.vy<=0&&before.y>=roof.y-.25&&state.pos.y<=roof.y){state.pos.y=roof.y;state.vy=0;state.jumps=0;}else if(state.pos.y<roof.y-.3){state.pos.x=before.x;state.pos.z=before.z;}}}
      if(Math.hypot(state.pos.x-8,state.pos.z+12)<1.1&&state.pos.y<.15&&state.padReady&&playing){state.vy=17;state.jumps=1;state.padReady=false;blu.jump(false);} 
      state.onRail = false;
      if (rail && state.pos.y < 5.05 && state.pos.y > 1.2 && state.vy <= 0) { state.pos.y = 5.1; state.vy = 0; state.jumps = 0; state.onRail = true; }
      else if (rail && Math.abs(state.pos.y - 5.1) < .01) { state.pos.y = 5.1; state.vy = 0; state.jumps = 0; state.onRail = true; }
      if (state.pos.y <= 0) { state.vy = 0; state.jumps = 0; }
      const grounded = state.pos.y <= 0 || state.onRail || state.vy===0;
      if (grounded && state.airborne) { state.airborne = false; blu.land(-vyBefore); if (-vyBefore > 12) { state.shake = Math.max(state.shake, .22); burst(tmpV.copy(state.pos).setY(state.pos.y + .1), 0xffffff, 10, 5, 1.5); } navigator.vibrate?.(12); }
      if (state.onRail && !state.railShown) { state.railShown = true; popup(tRef.current.rail, tmpV.copy(state.pos).setY(state.pos.y + 3), 'small'); }
      if (!rail) state.railShown = false;
      const secret = state.pos.x > 13 && state.pos.z < -23; if (secret && !state.secretShown) { state.secretShown = true; popup(tRef.current.secret, tmpV.copy(state.pos).setY(3), 'small'); }
      // Facing: run direction; when idle BLU turns to the camera and looks around
      if (mag > .05 || state.dash > 0) { state.idle = 0; if (mag > .05) state.yaw = Math.atan2(move.x, move.z); } else state.idle += dt;
      const celebrating = (extraCelebrate>0&&state.time-extraCelebrate<3.6)|| (state.restoreTime > 0 && state.time - state.restoreTime < 3.6) || (state.metroTime > 0 && state.time - state.metroTime < 3.6);
      const faceCam = !playing || celebrating || state.idle > 2.2;
      const charging = control.charge && ((!challenge&&activeLevel>2&&!progress.completed.includes(activeLevel)&&progress.objectives[activeLevel].every(Boolean)&&state.pos.distanceTo(terminals[activeLevel])<4&&(activeLevel!==5||escort&&mechanic.position.distanceTo(terminals[5])<5)) || (challenge&&!runDone&&state.bolts>=20&&state.time>=20&&state.pos.distanceTo(runFinish)<4) || (!challenge&&(activeLevel === 1 && found.every(Boolean) && !restored && Math.hypot(state.pos.x, state.pos.z + 35) < 4.2) || (!challenge&&activeLevel === 2 && !metroDone && metroFound.every(Boolean) && Math.hypot(state.pos.x + 9, state.pos.z + 50) < 4.2)));
      blu.root.position.copy(state.pos);
      blu.update(dt, { speed: Math.min(1, state.speed / 9), grounded, vy: state.vy, sliding: state.slide > 0, dashing: state.dash > 0, charging, celebrating, overcharge: state.over > 0, waving: !playing || (state.idle > 4 && state.idle % 6 < 1.6), yaw: faceCam ? 0 : state.yaw });
      blu.setEnergy(state.energy);blu.setEquipment(progress);
      const shadow = blu.root.getObjectByName('shadow'); if (shadow) { shadow.position.y = (state.onRail ? 0 : -state.pos.y) + .03; shadow.scale.setScalar(Math.max(.4, 1 - state.pos.y * .06)); }
      // Collectibles
      const spin = state.time * 3;
      for (let i = 0; i < boltSpots.length; i++) {
        const p = boltSpots[i];
        if (!boltTaken[i] && playing && Math.abs(p.x - state.pos.x) < 1.1 && Math.abs(p.z - state.pos.z) < 1.1 && Math.abs(p.y - (state.pos.y + .9)) < 1.4) { boltTaken[i] = true; state.bolts++;state.energy=Math.min(100,state.energy+3);if(state.energy>=100&&state.over===0)state.over=progress.inventory.includes('battery')?10:7; burst(p, 0xffd43b, 5, 3, 3); pulseBolts(); navigator.vibrate?.(6); }
        dummy.position.set(p.x, p.y + Math.sin(state.time * 4 + i * .5) * .12, p.z); dummy.rotation.set(0, spin + i * .2, 0); dummy.scale.setScalar(boltTaken[i] ? 0 : 1.15); dummy.updateMatrix(); boltMesh.setMatrixAt(i, dummy.matrix);
      }
      boltMesh.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < 3; i++) { const gem = cells[i].children[0]; gem.rotation.y += dt * 1.8; gem.position.y = 1.9 + Math.sin(state.time * 3 + i) * .2; if (playing && activeLevel === 1 && !found[i] && Math.hypot(state.pos.x - cells[i].position.x, state.pos.z - cells[i].position.z) < 1.8 && state.pos.y < 3.5) { found[i] = true; cells[i].visible = false; state.energy = Math.min(100, state.energy + 35); if (state.energy >= 100) { state.over = progress.inventory.includes("battery")?10:7; state.energy = 100; popup(tRef.current.overcharge, tmpV.copy(cells[i].position).setY(4), 'big'); } else popup(tRef.current.cell, tmpV.copy(cells[i].position).setY(3.5)); burst(tmpV.copy(cells[i].position).setY(1.9), 0x6ff7ff, 22, 7, 6); save(); navigator.vibrate?.(35); publish(); } }
      for (let i = 0; i < 2; i++) { const core = metroCores[i]; core.children[0].rotation.y += dt * 1.4; if (playing && activeLevel === 2 && !metroFound[i] && Math.hypot(state.pos.x - core.position.x, state.pos.z - core.position.z) < 1.8) { metroFound[i] = true; core.visible = false; state.energy = Math.min(100, state.energy + 35); popup(tRef.current.core, tmpV.copy(core.position).setY(3.5)); burst(tmpV.copy(core.position).setY(1.6), 0xff7ad0, 22, 7, 6); save(); navigator.vibrate?.(35); publish(); } }
      if (charging && !challenge&&activeLevel === 1) { state.charge = Math.min(1, state.charge + dt / (progress.inventory.includes("gloves")?1.12:1.6)); if (Math.random() < .5) burst(tmpV.set((Math.random() - .5) * 5, .3, -35 + (Math.random() - .5) * 5), 0x6ff7ff, 1, 1, 7); if (state.charge >= 1) { restored = true; state.restoreTime = state.time; state.shake = .5; award(1); applyLights(false); burst(tmpV.set(0, 5, -35), 0xffe27a, 40, 16, 10); callbacks.current.onReward(); navigator.vibrate?.([40, 30, 90]); publish(); } }
      else if (charging && !challenge&&activeLevel === 2) { state.charge = Math.min(1, state.charge + dt / (progress.inventory.includes("gloves")?1.05:1.5)); if (state.charge >= 1) { metroDone = true; state.metroTime = state.time; state.shake = .4; stationSign.material = litMats.station; burst(tmpV.set(-9, 4, -50), 0xff7ad0, 36, 14, 9); award(2);applyLights(true); navigator.vibrate?.([40, 30, 90]); publish(); } }
      else if(charging&&(activeLevel>2||challenge)){state.charge=Math.min(1,state.charge+dt/(progress.inventory.includes('gloves')?1.05:1.5));if(state.charge>=1){if(challenge){const before=progress.runs;progress=dispatchProgress({type:'run-finish',bolts:state.bolts});runDone=progress.runs>before;}else {award(activeLevel);applyLights(true);}extraCelebrate=state.time;state.shake=.4;burst(tmpV.copy(state.pos).setY(state.pos.y+2),0x6ff7ff,35,14,8);publish();}}
      else state.charge = Math.max(0, state.charge - dt * 1.5);
      if (state.restoreTime > 0 && litWindows < wi) { const goal = Math.min(Math.floor(wi*progress.completed.length/6), Math.floor((state.time - state.restoreTime) * 160)); for (; litWindows < goal; litWindows++) lightWindow(litWindows); if (windowsMesh.instanceColor) windowsMesh.instanceColor.needsUpdate = true; lamps.forEach((l, i) => { if (i < Math.min(lamps.length*progress.completed.length/6,(state.time - state.restoreTime) * 8)) l.material = litMats.lamp; }); signs.forEach((s, i) => { if (i < Math.min(signs.length*progress.completed.length/6,(state.time - state.restoreTime) * 3)) s.material = litMats.sign; }); }
      for(const id of [3,4,5,6]){extra[id].forEach((o,i)=>{o.visible=!challenge&&activeLevel===id&&!progress.objectives[id][i];o.children[0].rotation.y+=dt*2;if(o.visible&&playing&&state.pos.distanceTo(o.position)<1.8){progress=dispatchProgress({type:'collect',id,index:i});state.energy=Math.min(100,state.energy+35);if(state.energy>=100)state.over=progress.inventory.includes('battery')?10:7;burst(tmpV.copy(o.position).setY(o.position.y+1.8),0x6ff7ff,18,6,6);publish();}});terminalRings[id].visible=!challenge&&activeLevel===id&&!progress.completed.includes(id)&&progress.objectives[id].every(Boolean);}
      if(activeLevel===5&&progress.objectives[5].every(Boolean)&&state.pos.distanceTo(mechanic.position)<4)escort=true;
      if(escort&&!progress.completed.includes(5)){const target=state.pos.clone();target.y=0;mechanic.position.lerp(target,1-Math.exp(-2*dt));mechanic.rotation.y=Math.atan2(target.x-mechanic.position.x,target.z-mechanic.position.z);}
      mechanic.visible=activeLevel===5||progress.completed.includes(5);if(progress.completed.includes(5))mechanic.position.set(24,0,-53);
      shopLight.material=progress.completed.includes(3)?litMats.station:T(0x344252);workshopLight.material=progress.completed.includes(5)?litMats.sign:T(0x344252);
      gate.visible=!progress.completed.includes(6);districtLamp.material=progress.completed.includes(6)?litMats.core:T(0x344252);
      if(progress.inventory.includes('street')){boulevardMat.color.setHex(0x603d94);signs.forEach(s=>s.material=litMats.sign);}
      // Ambient life
      hitCooldown=Math.max(0,hitCooldown-dt);if(playing&&hitCooldown===0&&state.pos.y<1&&state.dash===0&&state.over===0&&traffic.some(v=>Math.abs(v.position.x-state.pos.x)<1.2&&Math.abs(v.position.z-state.pos.z)<1.8)){state.energy=Math.max(0,state.energy-15);state.pos.x=THREE.MathUtils.clamp(state.pos.x+(state.pos.x>=0?-2:2),-17,32);state.shake=.4;hitCooldown=1.5;burst(tmpV.copy(state.pos).setY(1),0xff664f,12);}
      train.position.z = metroDone && (state.restoreTime === 0 || state.time - state.restoreTime > 2) ? -65 + (state.time * 10 % 90) : -65;
      drones.forEach((d, i) => { d.position.x = (i % 2 ? 8 : -8) + Math.sin(state.time * .7 + i) * 2.4; d.position.y = 9 + i * 2 + Math.sin(state.time * 1.9 + i) * .5; d.rotation.y = Math.sin(state.time * .7 + i) * .4; });
      traffic.forEach((v, i) => { v.position.z = 14 - ((state.time * (6 + i * 1.5) + i * 24) % 70); });
      clouds.forEach((c, i) => { c.position.x = ((c.position.x + dt * (1 + i * .3) + 120) % 240) - 120; });
      pad.rotation.y += dt; padRing.scale.setScalar(1 + (state.time * 1.5 % 1) * .5); (padRing.material as THREE.MeshBasicMaterial).opacity = 1;
      genRing.visible = challenge?(!runDone&&state.bolts>=20):activeLevel === 1 && !restored && found.every(Boolean); if(challenge)genRing.position.copy(runFinish).setY(.2);genRing.scale.setScalar(1 + Math.sin(state.time * 4) * .05);
      for (const p of parts) if (p.life > 0) { p.life -= dt; p.v.y -= 14 * dt; p.m.position.addScaledVector(p.v, dt); p.m.rotation.x += dt * 6; if (p.life <= 0) p.m.visible = false; else p.m.scale.multiplyScalar(.985); }
      trail.forEach((o, i) => { o.visible = state.over > 0 || state.dash > 0; o.position.set(state.pos.x - Math.sin(state.yaw) * (.6 + i * .45) + Math.sin(state.time * 12 + i) * .2, state.pos.y + .8 + Math.sin(state.time * 9 + i) * .25, state.pos.z - Math.cos(state.yaw) * (.6 + i * .45)); o.scale.setScalar(.14 - i * .02); });
      // Camera: title shot in front of BLU, then chase camera
      const desired = playing ? tmpV.set(state.pos.x * .85, state.pos.y + 4.1 + (state.vy > 0 ? .4 : 0), state.pos.z + (state.dash > 0 ? 8.2 : 7.2)) : tmpV.set(state.pos.x + 1.4 + Math.sin(state.time * .3) * .5, 2.1, state.pos.z + 5.6);
      camPos.lerp(desired, 1 - Math.exp(-(playing ? 5 : 2.5) * dt));
      const lookGoal = playing ? new THREE.Vector3(state.pos.x, state.pos.y + 1.6, state.pos.z - 9) : new THREE.Vector3(state.pos.x - .9, 1.55, state.pos.z - 4);
      look.lerp(lookGoal, 1 - Math.exp(-5 * dt));
      state.shake = Math.max(0, state.shake - dt); const sh = state.shake * .5;
      camera.position.set(camPos.x + (Math.random() - .5) * sh, camPos.y + (Math.random() - .5) * sh, camPos.z); camera.lookAt(look);
      const fovBase = size.w / size.h < .7 ? 70 : 62; camera.fov = THREE.MathUtils.damp(camera.fov, fovBase + (state.dash > 0 || state.over > 0 ? 10 : 0), 5, dt); camera.updateProjectionMatrix();
      sky.position.copy(camera.position);
      if (state.time - state.lastHud > .15) { state.lastHud = state.time; publish(); }
      renderer.render(scene, camera);
    };
    publish(); animate();
    return () => { cancelAnimationFrame(frame); resize.disconnect(); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); mats.forEach(m => m.dispose()); disposables.forEach(d => d.dispose()); windowsMesh.dispose(); boltMesh.dispose(); renderer.dispose(); renderer.domElement.remove(); };
  }, [serverRestored,challenge]);

  // Touch: swipe up = jump, down = slide, sideways = dash (anywhere on the stage)
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { const p = e.touches[0]; touch.current = { x: p.clientX, y: p.clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => { if (!touch.current) return; const p = e.changedTouches[0], dx = p.clientX - touch.current.x, dy = p.clientY - touch.current.y; if (Math.abs(dy) > 35 && Math.abs(dy) > Math.abs(dx)) input.current[dy < 0 ? 'jump' : 'slide'] = true; else if (Math.abs(dx) > 35) input.current.dash = true; touch.current = null; };
  const stick = (e: React.PointerEvent<HTMLDivElement>) => { const r = e.currentTarget.getBoundingClientRect(); let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2); const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } input.current.x = x; input.current.y = y; if (knob.current) knob.current.style.transform = `translate(${x * 32}px, ${y * 32}px)`; };
  const release = () => { input.current.x = 0; input.current.y = 0; if (knob.current) knob.current.style.transform = ''; };
  const hold = (on: boolean) => () => { input.current.charge = on; };
  const extended={en:{collect:"Collect the marked energy",charge:"Hold Charge at the beacon",go:"Reach the marked destination",done:"Mission complete!",next:"Continue",run:"Collect 20 bolts, then charge the finish beacon",escort:"Lead the robot to the workshop"},he:{collect:"אסוף את האנרגיה המסומנת",charge:"החזק טעינה בנקודת הסיום",go:"הגע ליעד המסומן",done:"המשימה הושלמה!",next:"ממשיכים",run:"אסוף 20 ברקים וטען את נקודת הסיום",escort:"לווה את הרובוט לסדנה"},ar:{collect:"اجمع الطاقة المعلّمة",charge:"اضغط الشحن عند النهاية",go:"وصل للهدف المعلّم",done:"المهمة اكتملت!",next:"كمّل",run:"اجمع 20 برق واشحن نقطة النهاية",escort:"رافق الروبوت للورشة"}}[lang];
  const objective = challenge?extended.run:status.level>2?status.levelDone?extended.done:status.extraGot<LEVELS[status.level-1].required?extended.collect:status.level===5?extended.escort:status.nearby?extended.charge:extended.go:status.level === 1 ? status.restored ? t.done : status.cells < 3 ? t.collect : status.nearby ? t.charge : t.generator : status.metroDone ? t.metroDone : status.metroCells < 2 ? t.metroCollect : status.nearby ? t.metroCharge : t.metroStation;
  const total = challenge?20:LEVELS[status.level-1].required, got = challenge?status.bolts:status.level>2?status.extraGot:status.level === 1 ? status.cells : status.metroCells;
  const canCharge = status.nearby && (challenge?status.bolts>=20&&status.runTime>=20&&!status.runDone:status.level>2?!status.levelDone&&status.extraGot===total:status.level === 1 ? !status.restored && status.cells === 3 : !status.metroDone && status.metroCells === 2);
  const segs = Math.ceil(status.energy / 20);

  return <div className={`play-root ${status.dashing || status.overcharge ? 'is-fast' : ''}`} dir={lang === 'en' ? 'ltr' : 'rtl'}>
    <div ref={host} className="play-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onClick={() => { if (!started) input.current.start = true; }} />
    <div className="speed-lines" aria-hidden="true" />
    <div ref={fx} className="fx-layer" aria-hidden="true" />
    {unsupported ? <div className="play-unsupported"><img src="/blu.webp" alt="BLU" /><p>{t.unsupported}</p><button className="btn3d yellow" onClick={onMenu}>{t.resume}</button></div> : !started ? <div className="title-screen" onClick={() => { input.current.start = true; begin(); }}>
      <div className="title-logo"><span className="logo-blu">BLU</span><span className="logo-city">CITY</span></div>
      <p className="level-title">{cityLabel} · {ui.level} {status.level}</p>
      <button className="btn3d yellow tap-play" onClick={e => { e.stopPropagation(); input.current.start = true; begin(); }}>{t.tap}</button>
      <button className="btn3d blue title-menu" onClick={e => { e.stopPropagation(); onMenu(); }}>{t.city}</button>
    </div> : <>
      <div className="hud-top">
        <div className="hud-left">
          <button className="btn3d round blue hud-pause" onClick={() => setPaused(true)} aria-label={t.pause}><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="1.5" fill="currentColor" /><rect x="14" y="4" width="5" height="16" rx="1.5" fill="currentColor" /></svg></button>
          <div className={`hud-battery ${status.energy < 20 ? 'low' : ''}`} role="progressbar" aria-label="Energy" aria-valuenow={status.energy} aria-valuemin={0} aria-valuemax={100}>{[0, 1, 2, 3, 4].map(i => <i key={i} className={i < segs ? 'on' : ''} />)}<b /></div>
        </div>
        <div className="hud-right">
          <div className="hud-score" aria-label={t.score}>{status.score.toLocaleString('en-US')}</div>
          <div ref={boltChip} className="hud-bolts" aria-label={ui.coins}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M13 2 4 13h7l-1 9 10-12h-7l1-8Z" fill="#ffd43b" stroke="#0b2a5b" strokeWidth="2" strokeLinejoin="round" /></svg>{status.coins}</div>
        </div>
      </div>
      <div className="hud-mission">
        <span className="mission-arrow" style={{ transform: `rotate(${status.direction}rad)` }} aria-hidden="true">▲</span>
        <div><strong>{cityLabel} · {ui.level} {status.level} · {objective}</strong><small>{challenge?`${status.bolts}/20 · ${status.runTime}s`:`${status.meters} m`}</small></div>
        {!status.levelDone&&!challenge && <div className="pips">{Array.from({ length: total }, (_, i) => <i key={i} className={i < got ? (status.level === 2 ? 'on pink' : 'on') : ''} />)}</div>}
      </div>
      {status.tutorial && <div className="play-tutorial">{t.start}</div>}
      {status.celebrating && <div className="victory"><div className="rays" /><strong>{extended.done}</strong><span>{LEVELS[status.level-1].names[lang]}</span></div>}
      {!challenge&&status.levelDone&&!status.celebrating&&<div className="level-complete"><strong>{ui.reward}{LEVELS[status.level-1].rewardCoins} {ui.coins}</strong><button className="btn3d yellow" onClick={()=>{input.current.next=true;}}>{status.level<6?`${extended.next} · ${ui.level} ${status.level+1}`:`${lang==='he'?'העיר התעוררה! לעיר הבאה':lang==='ar'?'المدينة استيقظت! للمدينة التالية':'City awakened! Next city'} · Level ${city+1}`}</button></div>}{challenge&&status.runDone&&<div className="level-complete"><strong>+40 Coin</strong><button className="btn3d yellow" onClick={onMenu}>{t.menu}</button></div>}
      <div className="play-controls">
        <div className="play-stick" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); stick(e); }} onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) stick(e); }} onPointerUp={release} onPointerCancel={release}><span ref={knob} /></div>
        <div className="play-actions">
          {canCharge ? <button className={`btn3d round green act-charge ${status.charge > 0 ? 'charging' : ''}`} style={{ ['--p' as string]: `${Math.round(status.charge * 100)}%` }} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); hold(true)(); }} onPointerUp={hold(false)} onPointerCancel={hold(false)}><span>{t.interact}</span></button>
            : <button className="btn3d round blue act-dash" disabled={status.energy < 12} onPointerDown={() => { input.current.dash = true; }}><span>{t.dash}</span></button>}
          <button className="btn3d round yellow act-jump" onPointerDown={() => { input.current.jump = true; }}><span>{t.jump}</span></button>
        </div>
      </div>
      {paused && <div className="play-pause"><div className="pause-card"><h2>{t.pause}</h2><p>{ui.level} 1 · {LEVELS[0].title} {status.restored ? '✓' : `${status.cells}/3`}</p><p>{ui.level} 2 · {status.restored ? `${LEVELS[1].title} ${status.metroDone ? '✓' : `${status.metroCells}/2`}` : ui.locked}</p><p>{ui.coins}: {status.coins} · BLU: {status.blu}</p><p>{ui.dash}: {status.dashLevel}/3</p><button className="btn3d yellow" disabled={status.coins < COINS_PER_BLU} onClick={() => { input.current.exchange = true; }}>{ui.exchange}</button><button className="btn3d blue" disabled={status.coins<120&&status.blu < DASH_COST_BLU || status.dashLevel >= 3} onClick={() => { input.current.upgrade = true; }}>{ui.upgrade} / 120 Coin</button><small>{getSyncStatus()==="cloud"?"Cloud save":ui.local}</small><button className="btn3d yellow" onClick={() => setPaused(false)}>{t.continue}</button><button className="btn3d blue" onClick={onMenu}>{t.menu}</button></div></div>}
    </>}
  </div>;
}

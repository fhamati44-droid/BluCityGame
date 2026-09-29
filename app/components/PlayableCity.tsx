'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

type Lang = 'en' | 'he' | 'ar';
type Props = { lang: Lang; onMenu: () => void; onReward: () => void; serverRestored: boolean };
const copy = {
  en: { objective: 'LIGHT UP THE CITY', collect: 'Find 3 Energy Cells', generator: 'Reach the main generator', charge: 'Hold CHARGE to restore power', done: 'CENTRAL GRID RESTORED', next: 'The Energy Tower awaits', menu: 'Menu', jump: 'JUMP', dash: 'DASH', slide: 'SLIDE', boost: 'BOOST', interact: 'CHARGE', start: 'Move with the stick · swipe up to jump', unsupported: '3D rendering is unavailable on this device', resume: 'Continue in the city map', rail: 'RAIL GRIND', secret: 'SECRET ROUTE', pause: 'PAUSED', continue: 'Continue', overcharge: 'OVERCHARGE!' },
  he: { objective: 'מאירים את העיר', collect: 'מצא 3 תאי אנרגיה', generator: 'הגע לגנרטור הראשי', charge: 'לחץ והחזק טעינה כדי להפעיל', done: 'CENTRAL GRID חזרה לחיים', next: 'מגדל האנרגיה מחכה באופק', menu: 'תפריט', jump: 'קפיצה', dash: 'דאש', slide: 'גלישה', boost: 'בוסט', interact: 'טעינה', start: 'זוז עם הג׳ויסטיק · החלק למעלה לקפוץ', unsupported: 'תלת־ממד אינו זמין במכשיר הזה', resume: 'המשך במפת העיר', rail: 'גלישה על מסילה', secret: 'דרך סודית', pause: 'הפסקה', continue: 'המשך', overcharge: 'טעינת יתר!' },
  ar: { objective: 'نوّر المدينة', collect: 'اجمع 3 خلايا طاقة', generator: 'وصل للمولّد الرئيسي', charge: 'اضغط مطولًا للشحن', done: 'رجعت الحياة لـ CENTRAL GRID', next: 'برج الطاقة مستنيك', menu: 'القائمة', jump: 'اقفز', dash: 'اندفاع', slide: 'انزلاق', boost: 'سرعة', interact: 'شحن', start: 'تحرك بالعصا · اسحب لفوق للقفز', unsupported: 'عرض 3D غير متاح على هذا الجهاز', resume: 'كمل في خريطة المدينة', rail: 'انزلاق على السكة', secret: 'طريق سري', pause: 'توقف', continue: 'كمل', overcharge: 'طاقة خارقة!' },
};
type Status = { cells: number; energy: number; distance: number; restored: boolean; nearby: boolean; overcharge: boolean; rail: boolean; secret: boolean; charge: number };
const checkpointKey = 'blu_central_grid_v1';

export default function PlayableCity({ lang, onMenu, onReward, serverRestored }: Props) {
  const host = useRef<HTMLDivElement>(null); const input = useRef({ x: 0, y: 0, jump: false, dash: false, slide: false, charge: false }); const callbacks = useRef({ onReward }); callbacks.current.onReward = onReward;
  const [unsupported, setUnsupported] = useState(false); const [paused, setPaused] = useState(false); const pausedRef = useRef(false); pausedRef.current = paused;
  const [status, setStatus] = useState<Status>({ cells: 0, energy: 0, distance: 0, restored: false, nearby: false, overcharge: false, rail: false, secret: false, charge: 0 });
  const t = copy[lang];
  useEffect(() => {
    const mount = host.current; if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); } catch { setUnsupported(true); return; }
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x07152c); scene.fog = new THREE.Fog(0x0b2140, 32, 108);
    const camera = new THREE.PerspectiveCamera(66, 1, .1, 170);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.65; renderer.shadowMap.enabled = false;
    renderer.domElement.className = 'play-canvas'; mount.append(renderer.domElement);
    const m = (color: number, glow = 0, intensity = 0) => new THREE.MeshStandardMaterial({ color, emissive: glow, emissiveIntensity: intensity, metalness: .34, roughness: .54 });
    const road = m(0x172d49), curb = m(0x3c7195), wall = m(0x25486c), roof = m(0x142d51), unlit = m(0x263d55), lit = m(0x54c9ef, 0x31c8ff, 1.3), gold = m(0xffd268, 0xffa42b, 1.2), grass = m(0x1a5b61), purple = m(0x9d86ec, 0x7568fa, .7);
    const addBox = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); mesh.position.set(x, y, z); parent.add(mesh); return mesh; };
    const addCyl = (rt: number, rb: number, h: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) => { const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 8), mat); mesh.position.set(x, y, z); parent.add(mesh); return mesh; };
    scene.add(new THREE.HemisphereLight(0x9cddff, 0x101d38, 2.3)); const moon = new THREE.DirectionalLight(0xc8e8ff, 2.4); moon.position.set(-12, 28, 12); scene.add(moon);
    const cyanLight = new THREE.PointLight(0x43dfff, 16, 28); cyanLight.position.set(0, 6, -33); scene.add(cyanLight);
    addBox(70, .4, 130, m(0x102942), 0, -.3, -36); addBox(12.5, .06, 90, road, 0, -.07, -27);
    for (const x of [-6.5, 6.5]) { addBox(.35, .22, 90, curb, x, .04, -27); addBox(3.4, .08, 90, grass, x + Math.sign(x) * 2.5, -.03, -27); }
    for (let z = 10; z > -69; z -= 5.5) addBox(.14, .025, 2.1, gold, 0, -.02, z);
    const windows: THREE.Mesh[] = []; const lamps: THREE.Mesh[] = [];
    // Repeated geometry stays small and shared; the restored district switches materials in place.
    for (let side of [-1, 1]) for (let i = 0; i < 12; i++) {
      const x = side * (12.2 + i % 3), z = 10 - i * 6.9, height = 7 + ((i * 7 + (side + 1) * 5) % 6) * 2.8;
      addBox(6.1, height, 5.3, i % 4 === 0 ? roof : wall, x, height / 2, z); addBox(6.4, .3, 5.5, roof, x, height + .1, z);
      for (let y = 2; y < height - 1; y += 2.1) for (let dx of [-1.8, 0, 1.8]) { const win = addBox(.8, .85, .05, unlit, x + dx, y, z + 2.69); windows.push(win); }
      if (i % 3 === 0) { addCyl(.09, .1, 4, curb, side * 6.9, 2, z); const lamp = addBox(.75, .22, .72, unlit, side * 6.9, 4.1, z); lamps.push(lamp); }
      if (i % 4 === 1) { addCyl(.12, .14, 1.4, curb, side * 8.5, .7, z); addCyl(.8, 1.15, 2.2, grass, side * 8.5, 2.3, z); }
    }
    // Landmark, station and elevated track are visible from the initial spawn.
    addBox(2.3, .4, 73, roof, -5.4, 5.2, -31); for (let z = 0; z > -65; z -= 9) addBox(.5, 5.1, .5, curb, -5.4, 2.6, z);
    for (const x of [-6, -4.8]) addBox(.13, .1, 70, lit, x, 5.46, -31);
    const pad = addCyl(.9, .9, .12, purple, -5.4, .09, -5); pad.name = 'launch-pad';
    const train = new THREE.Group(); addBox(2.6, 2.1, 7, m(0x58a6c9), 0, 0, 0, train); for (const z of [-2, 0, 2]) addBox(2.66, .7, 1.2, lit, 0, .25, z, train); train.position.set(-5.4, 6.65, -65); scene.add(train);
    const drones = [0, 1, 2].map((i) => { const g = new THREE.Group(); addBox(.8, .25, .7, wall, 0, 0, 0, g); addBox(1.7, .05, .16, lit, 0, 0, 0, g); addCyl(.17, .17, .24, gold, 0, .19, 0, g); g.position.set(i % 2 ? 8 : -8, 9 + i * 2, -11 - i * 15); scene.add(g); return g; });
    const traffic = [0, 1].map((i) => { const g = new THREE.Group(); addBox(1.4, .65, 2.6, i ? purple : curb, 0, .46, 0, g); addBox(1.15, .4, 1.25, wall, 0, .95, -.24, g); addBox(1.2, .14, .12, gold, 0, .5, -1.32, g); g.position.set(i ? 3.7 : -3.7, 0, 9 - i * 25); scene.add(g); return g; });
    addBox(11, 6.5, 8, wall, 12, 3.2, -28); addBox(11.5, .45, 8.5, purple, 12, 6.6, -28);
    const tower = new THREE.Group(); addCyl(3.3, 4, 36, wall, 0, 18, -94, tower); addCyl(1.9, 3.2, 8, lit, 0, 40, -94, tower); addCyl(.4, .4, 10, lit, 0, 49, -94, tower); scene.add(tower);
    const gen = new THREE.Group(); addCyl(2.7, 3.1, .8, roof, 0, .5, -35, gen); addCyl(1.3, 1.7, 4.2, wall, 0, 2.8, -35, gen); addCyl(1.15, 1.15, .3, unlit, 0, 5, -35, gen); scene.add(gen);
    const cells = [[-2.8, -8], [3, -18], [-2, -27]].map(([x, z]) => { const group = new THREE.Group(); const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.78), lit); gem.position.y = 1.9; group.add(gem); addCyl(.85, .85, .06, lit, 0, .15, 0, group); group.position.set(x, 0, z); scene.add(group); return group; });
    // BLU is a character in the world, with a moving body, face, arms, shoes and luminous charge stripe.
    const blu = new THREE.Group(); const bodyMat = m(0x188ee0, 0x0960bb, .18), white = m(0xd9f8ff), dark = m(0x092448), sole = m(0x0e3983);
    addBox(1.25, 1.8, .75, bodyMat, 0, 1.55, 0, blu); addBox(1.08, .22, .8, dark, 0, 2.53, 0, blu); addBox(.78, .1, .04, lit, 0, 2.06, -.41, blu);
    for (let s of [-1, 1]) { addCyl(.18, .18, .92, bodyMat, s * .86, 1.65, 0, blu); addBox(.39, .27, .5, white, s * .88, 1.1, -.07, blu); addBox(.4, .62, .48, bodyMat, s * .35, .46, 0, blu); addBox(.55, .24, .83, sole, s * .35, .12, -.18, blu); addBox(.16, .22, .06, white, s * .24, 1.8, -.405, blu); addBox(.09, .12, .07, dark, s * .23, 1.8, -.45, blu); }
    addBox(.35, .07, .06, dark, 0, 1.39, -.43, blu); scene.add(blu);
    const trail = [0, 1, 2, 3].map(() => { const orb = new THREE.Mesh(new THREE.SphereGeometry(.11, 6, 6), lit); scene.add(orb); return orb; });
    let saved: { cells?: boolean[]; restored?: boolean } = {}; try { saved = JSON.parse(localStorage.getItem(checkpointKey) || '{}'); } catch {};
    const found = Array.isArray(saved.cells) && saved.cells.length === 3 ? saved.cells : [false, false, false]; let restored = Boolean(saved.restored || serverRestored);
    cells.forEach((c, i) => { c.visible = !found[i]; });
    const applyLights = () => { windows.forEach(w => { w.material = lit; }); lamps.forEach(l => { l.material = gold; }); gen.children.forEach(child => { if (child instanceof THREE.Mesh && child.position.y > 4) child.material = lit; }); scene.fog = new THREE.Fog(0x14395a, 47, 125); };
    if (restored) applyLights();
    const state = { pos: new THREE.Vector3(0, 0, 10), vy: 0, jumps: 0, speed: 0, energy: restored ? 65 : 0, dash: 0, slide: 0, over: 0, charge: 0, time: 0, lastHud: 0, restoreTime: 0, padReady: true };
    const key = new Set<string>(); const down = (e: KeyboardEvent) => { key.add(e.code); if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault(); if (e.code === 'Space') input.current.jump = true; if (e.code === 'ShiftLeft') input.current.dash = true; if (e.code === 'ControlLeft') input.current.slide = true; }; const up = (e: KeyboardEvent) => { key.delete(e.code); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    const resize = new ResizeObserver(() => { const w = mount.clientWidth, h = mount.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }); resize.observe(mount);
    const clock = new THREE.Clock(); let frame = 0; const cameraTarget = new THREE.Vector3(0, 4.3, 18);
    const publish = () => setStatus({ cells: found.filter(Boolean).length, energy: Math.round(state.energy), distance: Math.max(0, Math.round(10 - state.pos.z)), restored, nearby: Math.hypot(state.pos.x, state.pos.z + 35) < 4, overcharge: state.over > 0, rail: Math.abs(state.pos.x + 5.4) < .8 && state.pos.z < -4, secret: state.pos.x > 5.1 && state.pos.z < -23, charge: state.charge });
    const animate = () => { frame = requestAnimationFrame(animate); const dt = Math.min(clock.getDelta(), .04); if (document.hidden || pausedRef.current) return; state.time += dt;
      const control = input.current; const horizontal = THREE.MathUtils.clamp(control.x + Number(key.has('KeyD') || key.has('ArrowRight')) - Number(key.has('KeyA') || key.has('ArrowLeft')), -1, 1);
      const forward = THREE.MathUtils.clamp(-control.y + Number(key.has('KeyW') || key.has('ArrowUp')) - Number(key.has('KeyS') || key.has('ArrowDown')), -1, 1);
      const sprint = key.has('ShiftRight') || (control.dash && state.dash <= 0); const rail = Math.abs(state.pos.x + 5.4) < .8 && state.pos.z < -4 && state.pos.z > -65;
      if (control.dash && state.dash <= 0 && state.energy >= 12) { state.dash = .32; state.energy -= 12; } control.dash = false;
      if (control.slide) state.slide = .55; control.slide = false;
      if (control.jump && state.jumps < 2) { state.vy = state.jumps ? 9 : 10.7; state.jumps++; } control.jump = false;
      state.dash = Math.max(0, state.dash - dt); state.slide = Math.max(0, state.slide - dt); state.over = Math.max(0, state.over - dt);
      const targetSpeed = state.dash > 0 ? 21 : state.over > 0 ? 15 : sprint ? 11 : rail ? 13 : 7.7; state.speed = THREE.MathUtils.damp(state.speed, targetSpeed, 8, dt);
      const movement = new THREE.Vector3(horizontal, 0, -forward); if (movement.lengthSq() > 1) movement.normalize();
      state.pos.x = THREE.MathUtils.clamp(state.pos.x + movement.x * state.speed * dt, -6.1, 6.1); state.pos.z = THREE.MathUtils.clamp(state.pos.z + movement.z * state.speed * dt, -38, 12);
      const onPad = Math.hypot(state.pos.x + 5.4, state.pos.z + 5) < .95; if (onPad && state.pos.y < .15 && state.padReady) { state.vy = 17; state.jumps = 1; state.padReady = false; } if (!onPad) state.padReady = true;
      state.vy -= 27 * dt; state.pos.y = Math.max(0, state.pos.y + state.vy * dt); if (state.pos.y <= 0) { state.vy = 0; state.jumps = 0; }
      if (rail && state.pos.y < 4.9 && state.pos.y > 1.2) { state.pos.y = 5.1; state.vy = 0; state.jumps = 0; }
      blu.position.copy(state.pos); blu.rotation.y = THREE.MathUtils.damp(blu.rotation.y, horizontal * -.28, 9, dt); blu.rotation.z = THREE.MathUtils.damp(blu.rotation.z, -horizontal * .11, 9, dt); blu.scale.y = THREE.MathUtils.damp(blu.scale.y, state.slide > 0 ? .55 : 1, 11, dt); blu.children[0].rotation.z = Math.sin(state.time * (movement.lengthSq() ? 17 : 3)) * (movement.lengthSq() ? .045 : .015);
      for (let i = 0; i < 3; i++) { cells[i].children[0].rotation.y += dt * 1.5; cells[i].children[0].position.y = 1.9 + Math.sin(state.time * 3 + i) * .18; if (!found[i] && state.pos.distanceTo(new THREE.Vector3(cells[i].position.x, state.pos.y, cells[i].position.z)) < 1.7) { found[i] = true; cells[i].visible = false; state.energy = Math.min(100, state.energy + 35); localStorage.setItem(checkpointKey, JSON.stringify({ cells: found, restored })); if (state.energy >= 100) { state.over = 7; state.energy = 100; } navigator.vibrate?.(35); publish(); } }
      if (control.charge && found.every(Boolean) && Math.hypot(state.pos.x, state.pos.z + 35) < 4 && !restored) { state.charge = Math.min(1, state.charge + dt / 1.6); if (state.charge >= 1) { restored = true; state.restoreTime = state.time; localStorage.setItem(checkpointKey, JSON.stringify({ cells: found, restored })); applyLights(); callbacks.current.onReward(); navigator.vibrate?.([40, 30, 90]); publish(); } } else state.charge = Math.max(0, state.charge - dt * 1.5);
      train.position.z = restored ? -65 + ((state.time - state.restoreTime) * 9 % 86) : -65;
      drones.forEach((d, i) => { d.position.x = (i % 2 ? 8 : -8) + Math.sin(state.time * .7 + i) * 2.1; d.position.y = 9 + i * 2 + Math.sin(state.time * 1.9 + i) * .45; });
      traffic.forEach((v, i) => { v.position.z = 12 - ((state.time * (i ? 6 : 8) + i * 28) % 58); });
      trail.forEach((o, i) => { o.visible = state.over > 0 || state.dash > 0; o.position.set(state.pos.x + Math.sin(state.time * 10 + i) * .34, state.pos.y + .5 + i * .31, state.pos.z + 1 + i * .48); o.scale.setScalar(state.over > 0 ? 1.8 : 1); });
      const desired = new THREE.Vector3(state.pos.x * .4, state.pos.y + 4.3 + (state.vy > 0 ? .4 : 0), state.pos.z + (state.dash > 0 ? 7.8 : 6.6)); cameraTarget.lerp(desired, 1 - Math.exp(-5 * dt)); camera.position.copy(cameraTarget); camera.lookAt(state.pos.x * .7, state.pos.y + 1.7, state.pos.z - 9); camera.fov = THREE.MathUtils.damp(camera.fov, state.dash > 0 || state.over > 0 ? 75 : 65, 4, dt); camera.updateProjectionMatrix();
      if (state.time - state.lastHud > .16) { state.lastHud = state.time; publish(); } renderer.render(scene, camera);
    }; animate();
    return () => { cancelAnimationFrame(frame); resize.disconnect(); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); scene.traverse(obj => { if (obj instanceof THREE.Mesh) { obj.geometry.dispose(); const mats = Array.isArray(obj.material) ? obj.material : [obj.material]; mats.forEach(mat => mat.dispose()); } }); renderer.dispose(); renderer.domElement.remove(); };
  }, [serverRestored]);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { const p = e.touches[0]; touch.current = { x: p.clientX, y: p.clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => { if (!touch.current) return; const p = e.changedTouches[0], dx = p.clientX - touch.current.x, dy = p.clientY - touch.current.y; if (Math.abs(dy) > 35 && Math.abs(dy) > Math.abs(dx)) input.current[dy < 0 ? 'jump' : 'slide'] = true; else if (Math.abs(dx) > 35) input.current.dash = true; touch.current = null; };
  return <div className="play-root" dir={lang === 'en' ? 'ltr' : 'rtl'} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
    <div ref={host} className="play-stage" />
    {unsupported ? <div className="play-unsupported"><img src="/blu.webp" alt="BLU"/><p>{t.unsupported}</p><button onClick={onMenu}>{t.resume}</button></div> : <>
      <div className="play-top"><button className="play-menu" onClick={() => setPaused(true)} aria-label={t.menu}>Ⅱ</button><div className="play-objective"><small>CENTRAL GRID · {t.objective}</small><strong>{status.restored ? t.done : status.cells < 3 ? t.collect : status.nearby ? t.charge : t.generator}</strong><span>{status.restored ? t.next : `${status.cells} / 3 ⚡`}</span></div></div>
      <div className="play-energy"><div style={{ width: `${status.energy}%` }} /><span>⚡ {status.energy}%</span></div>
      {status.overcharge && <div className="play-overcharge">{t.overcharge}</div>}{status.rail && <div className="play-context">{t.rail}</div>}{status.secret && <div className="play-context">{t.secret}</div>}
      {!status.restored && status.distance < 3 && <div className="play-tutorial">{t.start}</div>}
      {status.restored && <div className="play-victory"><strong>{t.done}</strong><span>{t.next}</span></div>}
      <div className="play-controls"><div className="play-stick" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); const r = e.currentTarget.getBoundingClientRect(); input.current.x = Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / (r.width / 2))); input.current.y = Math.max(-1, Math.min(1, (e.clientY - r.top - r.height / 2) / (r.height / 2))); }} onPointerMove={e => { if (!e.currentTarget.hasPointerCapture(e.pointerId)) return; const r = e.currentTarget.getBoundingClientRect(); input.current.x = Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / (r.width / 2))); input.current.y = Math.max(-1, Math.min(1, (e.clientY - r.top - r.height / 2) / (r.height / 2))); }} onPointerUp={() => { input.current.x = 0; input.current.y = 0; }} onPointerCancel={() => { input.current.x = 0; input.current.y = 0; }}><span style={{ transform: `translate(${status.distance < 0 ? 0 : input.current.x * 25}px, ${input.current.y * 25}px)` }} /></div><div className="play-actions"><button onPointerDown={() => { input.current.dash = true; }} onClick={() => { input.current.dash = true; }}>{t.dash}</button><button className="primary" onPointerDown={() => { input.current.jump = true; }} onClick={() => { input.current.jump = true; }}>{t.jump}</button>{status.cells === 3 && !status.restored && <button className="charge" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); input.current.charge = true; }} onPointerUp={() => { input.current.charge = false; }} onPointerCancel={() => { input.current.charge = false; }}>{t.interact} {status.charge > 0 ? `${Math.round(status.charge * 100)}%` : ''}</button>}</div></div>
      {paused && <div className="play-pause"><h2>{t.pause}</h2><button onClick={() => setPaused(false)}>{t.continue}</button><button onClick={onMenu}>{t.menu}</button></div>}
    </>}
  </div>;
}

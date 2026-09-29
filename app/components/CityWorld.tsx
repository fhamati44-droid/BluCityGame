'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export type Place = 'mission' | 'charge' | 'upgrade' | 'district';
export type PlaceLabels = Record<Place, string>;
const places: { id: Place; x: number; z: number; color: number }[] = [
  { id: 'mission', x: -5.1, z: 0.8, color: 0xffc574 },
  { id: 'charge', x: 0, z: -1.2, color: 0x59eaff },
  { id: 'upgrade', x: 5.1, z: 0.8, color: 0xab91ff },
  { id: 'district', x: 0, z: 6, color: 0x6bf3b8 },
];

function box(w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); mesh.position.set(x, y, z); return mesh;
}
function cylinder(radiusTop: number, radiusBottom: number, h: number, material: THREE.Material, x: number, y: number, z: number, sides = 8) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, h, sides), material); mesh.position.set(x, y, z); return mesh;
}

export default function CityWorld({ district, labels, selected, onSelect, compact = false }: { district: number; labels: PlaceLabels; selected: Place | null; onSelect: (place: Place) => void; compact?: boolean }) {
  const mount = useRef<HTMLDivElement>(null); const onSelectRef = useRef(onSelect); const [failed, setFailed] = useState(false);
  onSelectRef.current = onSelect;
  useEffect(() => {
    const host = mount.current; if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
    catch { setFailed(true); return; }
    const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x0c2242, 0.018);
    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 120); const focus = new THREE.Vector3(0, 0.8, 1.2);
    const material = (color: number, emissive = 0x000000, intensity = 0) => new THREE.MeshStandardMaterial({ color, metalness: 0.26, roughness: 0.55, emissive, emissiveIntensity: intensity });
    const road = material(0x18395d), roadEdge = material(0x2e6289), ground = material(0x102b4a), platform = material(0x204c74), wall = material(0x33648d), roof = material(0x1c3b65), dark = material(0x143052), windowBlue = material(0x5bdfff, 0x27caff, 1.4), windowWarm = material(0xffd783, 0xffac42, 1), purple = material(0x9c8cff, 0x7860ff, 1.2), green = material(0x63efad, 0x25d88e, 1.1), gold = material(0xffca66, 0xe89728, 1.2);
    scene.add(new THREE.HemisphereLight(0xb6e7ff, 0x132746, 2.1)); const sun = new THREE.DirectionalLight(0xb5daff, 2.2); sun.position.set(-5, 13, 8); scene.add(sun);
    const groundMesh = box(23, .45, 23, ground, 0, -.4, 1.5); scene.add(groundMesh);
    const avenue = box(3.1, .05, 21, road, 0, -.13, 1); scene.add(avenue);
    const cross = box(21, .05, 2.8, road, 0, -.12, 1.25); scene.add(cross);
    for (const x of [-1.55, 1.55]) scene.add(box(.07, .025, 21, roadEdge, x, -.09, 1));
    for (const z of [-0.23, 2.72]) scene.add(box(21, .025, .07, roadEdge, 0, -.08, z));
    for (let z = -8; z < 11; z += 1.7) scene.add(box(.08, .025, .7, gold, 0, -.07, z));
    for (let x = -9; x < 10; x += 1.7) scene.add(box(.7, .025, .08, gold, x, -.07, 1.25));
    const clickable: THREE.Object3D[] = [];
    const addInteractive = (group: THREE.Group, id: Place) => { group.userData.place = id; group.traverse(obj => { if (obj instanceof THREE.Mesh) { obj.userData.place = id; clickable.push(obj); } }); scene.add(group); };
    // Central power core: layered tower, illuminated fins, animated reactor ring.
    const core = new THREE.Group(); core.position.set(0, 0, -1.2);
    core.add(cylinder(2.05, 2.25, .45, platform, 0, .12, 0, 12)); core.add(cylinder(1.65, 1.85, 2.2, wall, 0, 1.3, 0, 10));
    core.add(cylinder(1.6, 1.65, .17, windowBlue, 0, 2.47, 0, 10)); core.add(cylinder(1.15, 1.45, 2.8, dark, 0, 3.75, 0, 10));
    core.add(cylinder(1.05, 1.18, .19, windowBlue, 0, 5.17, 0, 10)); core.add(cylinder(.5, .8, 1.25, windowBlue, 0, 5.8, 0, 8));
    core.add(cylinder(.14, .14, 2.5, windowBlue, 0, 7.15, 0, 8));
    for (let a = 0; a < 10; a++) { const angle = a * Math.PI * 2 / 10; core.add(box(.19, 1.6, .08, windowBlue, Math.sin(angle) * 1.53, 3.72, Math.cos(angle) * 1.53)); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.85, .07, 6, 36), windowBlue); ring.rotation.x = Math.PI / 2; ring.position.y = 3.05; core.add(ring);
    addInteractive(core, 'charge');
    // Mission hub: warm-lit launch hangar and signal spire.
    const hub = new THREE.Group(); hub.position.set(-5.1, 0, .8);
    hub.add(box(3.5, .34, 3.5, platform, 0, .05, 0)); hub.add(box(2.8, 2.6, 2.5, wall, 0, 1.5, 0)); hub.add(box(3.15, .26, 2.8, roof, 0, 2.91, 0));
    hub.add(box(1.3, 1.45, .08, gold, 0, 1.12, 1.3)); hub.add(box(2.1, .17, .12, gold, 0, 2.41, 1.32));
    hub.add(cylinder(.17, .17, 2.3, gold, 0, 4.08, 0, 8)); hub.add(cylinder(.4, .13, .7, gold, 0, 5.4, 0, 6));
    addInteractive(hub, 'mission');
    // Upgrade lab: asymmetric stacked tech blocks and purple energy array.
    const lab = new THREE.Group(); lab.position.set(5.1, 0, .8);
    lab.add(box(3.55, .35, 3.55, platform, 0, .05, 0)); lab.add(box(2.65, 2.25, 2.45, wall, 0, 1.32, 0)); lab.add(box(1.8, 1.35, 1.85, roof, -.3, 3.12, -.25));
    lab.add(box(1.5, .2, .15, purple, 0, 2.18, 1.3)); lab.add(box(.65, 1.2, .11, purple, 0, 1.18, 1.27));
    for (const x of [-1.5, 1.5]) { lab.add(cylinder(.17, .17, 3.6, dark, x, 2, -.85)); lab.add(cylinder(.4, .25, .24, purple, x, 3.88, -.85)); }
    addInteractive(lab, 'upgrade');
    // Sky gate at the end of the boulevard: the next city zone.
    const gate = new THREE.Group(); gate.position.set(0, 0, 6);
    gate.add(box(4.6, .3, 2.2, platform, 0, .04, 0)); for (const x of [-1.65, 1.65]) gate.add(box(.75, 4.3, .9, dark, x, 2.17, 0));
    gate.add(box(4.15, .65, 1.1, green, 0, 4.48, 0)); gate.add(box(3.1, .15, .25, green, 0, 3.45, .53));
    gate.add(cylinder(.65, .65, .17, green, 0, 4.9, 0, 8)); addInteractive(gate, 'district');
    // Side streets: district buildings become illuminated as progress grows.
    for (let side of [-1, 1]) for (let row = 0; row < 5; row++) {
      const x = side * (4.9 + (row % 2) * .35), z = -7.4 + row * 4.25;
      if (Math.abs(z - .8) < 1.1 || Math.abs(z + 1.2) < 1.1 || Math.abs(z - 6) < 1.1) continue;
      const lit = row + (side === 1 ? 5 : 0) < district;
      const g = new THREE.Group(); g.position.set(x, 0, z); const height = 1.55 + ((row * 7 + (side + 1) * 3) % 4) * .55;
      g.add(box(2.2, .2, 2, platform, 0, .02, 0)); g.add(box(1.72, height, 1.63, lit ? wall : dark, 0, height / 2 + .15, 0)); g.add(box(1.96, .16, 1.8, roof, 0, height + .22, 0));
      for (let floor = .85; floor < height; floor += .75) for (const wx of [-.43, .43]) g.add(box(.28, .23, .035, lit ? windowWarm : roadEdge, wx, floor, .84));
      scene.add(g);
    }
    // Trees and street lights add scale and depth.
    for (let x of [-8.7, -3, 3, 8.7]) for (let z of [-7, 4.1, 9]) {
      if ((Math.abs(x) < 4 && Math.abs(z - 4.1) < 1) || (Math.abs(x) > 4 && z === 4.1)) continue;
      scene.add(cylinder(.09, .11, .9, roof, x, .4, z, 6)); scene.add(cylinder(.45, .6, 1.35, green, x, 1.55, z, 6));
    }
    for (let z of [-5, 3.7, 8.3]) for (let side of [-1, 1]) { const x = side * 2.1; scene.add(cylinder(.05, .05, 2.1, roadEdge, x, 1, z, 6)); scene.add(cylinder(.21, .16, .19, windowWarm, x, 2.1, z, 6)); }
    const accent = new THREE.PointLight(0x33d8ff, 18, 16); accent.position.set(0, 5.2, -1.2); scene.add(accent);
    renderer.setClearColor(0x000000, 0); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.5;
    renderer.domElement.className = 'city-canvas'; renderer.domElement.setAttribute('aria-label', 'Interactive 3D BLU City'); renderer.domElement.style.touchAction = 'none'; host.appendChild(renderer.domElement);
    const size = () => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const resize = new ResizeObserver(size); resize.observe(host); size();
    let angle = -.52, elevation = .87, distance = compact ? 22 : 18.5, frame = 0, downX = 0, downY = 0, dragged = false, active = true;
    const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2();
    const onDown = (e: PointerEvent) => { downX = e.clientX; downY = e.clientY; dragged = false; renderer.domElement.setPointerCapture(e.pointerId); };
    const onMove = (e: PointerEvent) => { if (!renderer.domElement.hasPointerCapture(e.pointerId)) return; const dx = e.clientX - downX, dy = e.clientY - downY; if (Math.abs(dx) + Math.abs(dy) > 4) dragged = true; angle -= dx * .006; elevation = Math.max(.35, Math.min(1.45, elevation + dy * .003)); downX = e.clientX; downY = e.clientY; };
    const onUp = (e: PointerEvent) => { if (renderer.domElement.hasPointerCapture(e.pointerId)) renderer.domElement.releasePointerCapture(e.pointerId); if (dragged) return; const rect = renderer.domElement.getBoundingClientRect(); pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1); raycaster.setFromCamera(pointer, camera); const hit = raycaster.intersectObjects(clickable, false)[0]; const id = hit?.object.userData.place as Place | undefined; if (id) onSelectRef.current(id); };
    const onWheel = (e: WheelEvent) => { e.preventDefault(); distance = Math.max(12, Math.min(29, distance + e.deltaY * .013)); };
    const canvas = renderer.domElement; canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('wheel', onWheel, { passive: false });
    const animate = () => { if (!active) return; frame = requestAnimationFrame(animate); if (document.hidden) return; const time = performance.now() * .001; ring.rotation.z = time * .26; core.children[core.children.length - 1].position.y = 3.05 + Math.sin(time * 2) * .16; accent.intensity = 17 + Math.sin(time * 2) * 3; camera.position.set(focus.x + Math.sin(angle) * distance, focus.y + Math.sin(elevation) * distance, focus.z + Math.cos(angle) * distance); camera.lookAt(focus); renderer.render(scene, camera); };
    animate();
    return () => { active = false; cancelAnimationFrame(frame); resize.disconnect(); canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('wheel', onWheel); scene.traverse(obj => { if (obj instanceof THREE.Mesh) { obj.geometry.dispose(); const mat = obj.material; if (Array.isArray(mat)) mat.forEach(m => m.dispose()); else mat.dispose(); } }); renderer.dispose(); canvas.remove(); };
  }, [district, compact]);
  return <div className={`city-world ${compact ? 'compact' : ''}`}><div className="city-viewport" ref={mount}>{failed && <div className="city-fallback" aria-hidden="true">✦</div>}</div><div className="city-controls" aria-label="City locations">{places.map(place => <button key={place.id} className={selected === place.id ? 'active' : ''} onClick={() => onSelect(place.id)}><span style={{ background: `#${place.color.toString(16).padStart(6, '0')}` }}/>{labels[place.id]}</button>)}</div></div>;
}

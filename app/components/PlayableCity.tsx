'use client';
import { localized, translateValue, isRtl, type Lang } from '../../lib/i18n';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { getProgress, checkpointProgress, dispatchProgress, getSyncStatus, useWalletTesting, setMissionPosition } from '../../lib/progress-store';
import { unlockedLevel, cityScale, cityName, cityMissions, missionInstruction, campaignCityIndex, CAMPAIGN_THEMES, CAMPAIGN_CITY_COUNT } from '../../lib/levels';
import { SPONSOR_SLOTS, localSponsorLogo } from '../../lib/sponsors';
import { BluRig, toon } from './BluRig';
import { completeLevel, exchangeCoins, upgradeDash, COINS_PER_BLU, DASH_COST_BLU, LEVELS, parseLevelProgress, SAVE_KEY, type LevelId } from '../../lib/levels';
type Props = {
    lang: Lang;
    onMenu: () => void;
    onReward: () => void;
    serverRestored: boolean;
    challenge?: boolean;
    mission?: LevelId;
};
const copy = {
    en: { zone: 'Central Grid', collect: 'Find 3 energy cells', generator: 'Run to the main generator', charge: 'Hold Charge to restore power', done: 'Power restored!', next: 'The Energy Tower is next', metro: 'Metro rush', metroCollect: 'Find 2 signal cores', metroStation: 'Run to the metro station', metroCharge: 'Hold Charge to start the metro', metroDone: 'Metro is running!', menu: 'Menu', jump: 'Jump', dash: 'Dash', interact: 'Charge', start: 'Stick to move · swipe up to jump', unsupported: 'This device can’t show the 3D city', resume: 'Open the city map', rail: 'Rail grind!', secret: 'Secret route!', pause: 'Paused', continue: 'Keep playing', overcharge: 'Overcharge!', tap: 'Tap to play', score: 'Score', city: 'City', flip: 'Flip!', cell: 'Energy cell!', core: 'Signal core!' },
    he: { zone: 'Central Grid', collect: 'מצא 3 תאי אנרגיה', generator: 'רוץ לגנרטור הראשי', charge: 'החזק טעינה כדי להחזיר חשמל', done: 'החשמל חזר!', next: 'מגדל האנרגיה הבא בתור', metro: 'מרוץ המטרו', metroCollect: 'מצא 2 ליבות איתות', metroStation: 'רוץ לתחנת המטרו', metroCharge: 'החזק טעינה להפעלת המטרו', metroDone: 'המטרו נוסע!', menu: 'תפריט', jump: 'קפיצה', dash: 'דאש', interact: 'טעינה', start: 'ג׳ויסטיק לתנועה · החלק למעלה לקפיצה', unsupported: 'המכשיר הזה לא יכול להציג את העיר בתלת־ממד', resume: 'פתח את מפת העיר', rail: 'גלישה על המסילה!', secret: 'דרך סודית!', pause: 'הפסקה', continue: 'ממשיכים לשחק', overcharge: 'טעינת יתר!', tap: 'לחץ כדי לשחק', score: 'ניקוד', city: 'עיר', flip: 'סלטה!', cell: 'תא אנרגיה!', core: 'ליבת איתות!' },
    ar: { zone: 'Central Grid', collect: 'اجمع 3 خلايا طاقة', generator: 'اركض للمولّد الرئيسي', charge: 'اضغط مطولًا لترجع الكهربا', done: 'رجعت الكهربا!', next: 'برج الطاقة هو الجاي', metro: 'سباق المترو', metroCollect: 'اجمع نواتين للإشارة', metroStation: 'اركض لمحطة المترو', metroCharge: 'اضغط مطولًا لتشغيل المترو', metroDone: 'المترو ماشي!', menu: 'القائمة', jump: 'اقفز', dash: 'اندفاع', interact: 'شحن', start: 'العصا للحركة · اسحب لفوق للقفز', unsupported: 'هالجهاز ما بقدر يعرض المدينة 3D', resume: 'افتح خريطة المدينة', rail: 'تزحلق على السكة!', secret: 'طريق سري!', pause: 'توقف', continue: 'كمّل لعب', overcharge: 'طاقة خارقة!', tap: 'اضغط لتلعب', score: 'النقاط', city: 'مدينة', flip: 'شقلبة!', cell: 'خلية طاقة!', core: 'نواة إشارة!' },
};
type Status = {
    completed: LevelId[];
    sync: string;
    carrying: boolean;
    escorting: boolean;
    escortReady: boolean;
    nodeReady: boolean;
    extraGot: number;
    levelDone: boolean;
    runTime: number;
    runDone: boolean;
    cells: number;
    metroCells: number;
    energy: number;
    meters: number;
    direction: number;
    restored: boolean;
    metroDone: boolean;
    level: LevelId;
    coins: number;
    blu: number;
    dashLevel: number;
    celebrating: boolean;
    nearby: boolean;
    overcharge: boolean;
    rail: boolean;
    secret: boolean;
    charge: number;
    dashing: boolean;
    score: number;
    bolts: number;
    tutorial: boolean;
};
const PALETTE = [0xff7b8e, 0x4fd6c8, 0xffc94d, 0x8b8cff, 0xff9f5a, 0x6fd3ff, 0xc98bff];
export default function PlayableCity({ lang, onMenu, onReward, serverRestored, challenge = false, mission }: Props) {
    const host = useRef<HTMLDivElement>(null);
    const fx = useRef<HTMLDivElement>(null);
    const knob = useRef<HTMLSpanElement>(null);
    const boltChip = useRef<HTMLDivElement>(null);
    const input = useRef({ x: 0, y: 0, jump: false, dash: false, slide: false, charge: false, start: false, next: false, exchange: false, upgrade: false });
    const callbacks = useRef({ onReward });
    callbacks.current.onReward = onReward;
    const [unsupported, setUnsupported] = useState(false);
    const [paused, setPaused] = useState(false);
    const [missionExpanded, setMissionExpanded] = useState(false);
    const [gestureMode, setGestureMode] = useState(false);
    const gestureRef = useRef(false), laneRef = useRef(0);
    gestureRef.current = gestureMode;

    const pausedRef = useRef(false);
    pausedRef.current = paused;
    const [started, setStarted] = useState(false);
    const startedRef = useRef(false);
    const [status, setStatus] = useState<Status>({ completed: [], sync: "device", carrying: false, escorting: false, escortReady: false, nodeReady: false, extraGot: 0, levelDone: false, runTime: 0, runDone: false, cells: 0, metroCells: 0, energy: 0, meters: 0, direction: 0, restored: false, metroDone: false, level: 1, coins: 0, blu: 0, dashLevel: 0, celebrating: false, nearby: false, overcharge: false, rail: false, secret: false, charge: 0, dashing: false, score: 0, bolts: 0, tutorial: true });
    const walletTesting = useWalletTesting();
    const t = localized(lang, copy);
    const tRef = useRef(t);
    tRef.current = t;
    const city = getProgress().cityLevel;
    const cityLabel = `Level ${city} · ${cityName(city, lang)}`;
    const ui = localized(lang, {
        en: { level: 'MISSION', coins: 'COINS', reward: 'LEVEL COMPLETE · +', next: 'Continue to Level 2', locked: 'Complete Level 1 to unlock', local: 'Progress saved on this device', exchange: 'Exchange 100 Coin → 1 BLU', upgrade: 'Upgrade dash · 2 BLU', dash: 'Dash upgrade' },
        he: { level: 'משימה', coins: 'מטבעות', reward: 'השלב הושלם · +', next: 'המשך לשלב 2', locked: 'יש להשלים את שלב 1', local: 'ההתקדמות נשמרת במכשיר הזה', exchange: 'המר 100 Coin ל־1 BLU', upgrade: 'שדרג דאש · 2 BLU', dash: 'שדרוג דאש' },
        ar: { level: 'مهمة', coins: 'العملات', reward: 'اكتملت المرحلة · +', next: 'تابع إلى المرحلة 2', locked: 'أكمل المرحلة 1 أولاً', local: 'يُحفظ التقدم على هذا الجهاز', exchange: 'حوّل 100 Coin إلى 1 BLU', upgrade: 'طوّر الاندفاع · 2 BLU', dash: 'تطوير الاندفاع' },
    });
    const begin = () => { if (startedRef.current)
        return; startedRef.current = true; setStarted(true); };
    useEffect(() => {
        const mount = host.current;
        if (!mount)
            return;
        let renderer: THREE.WebGLRenderer;
        try {
            renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        }
        catch {
            setUnsupported(true);
            return;
        }
        const scene = new THREE.Scene();
        const FOG = getProgress().cityLevel===2?0x8059a5:getProgress().cityLevel===3?0x29456b:0xffbe9c;
        scene.fog = new THREE.Fog(FOG, 40, 150);
        const camera = new THREE.PerspectiveCamera(62, 1, .1, 400);
        renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.NoToneMapping;
        renderer.domElement.className = 'play-canvas';
        mount.append(renderer.domElement);
        const disposables: {
            dispose: () => void;
        }[] = [];
        let progress = getProgress();
        const missions = cityMissions(progress.cityLevel), theme = CAMPAIGN_THEMES[campaignCityIndex(progress.cityLevel)];
        const terminalVectors=Object.fromEntries(missions.map(m=>[m.id,new THREE.Vector3(...m.terminal as [number,number,number])]));
        const terminalDistance=(id:number)=>state.pos.distanceTo(terminalVectors[id]);
        const mats = new Map<string, THREE.Material>();
        const T = (color: number, glow = 0, gi = 0) => { const k = `${color}-${glow}-${gi}`; let mm = mats.get(k); if (!mm) {
            mm = toon(color, glow, gi);
            mats.set(k, mm);
        } return mm; };
        const B = (color: number) => { const k = `b${color}`; let mm = mats.get(k); if (!mm) {
            mm = new THREE.MeshBasicMaterial({ color });
            mats.set(k, mm);
        } return mm; };
        const boxGeo = new THREE.BoxGeometry(1, 1, 1), cylGeo = new THREE.CylinderGeometry(1, 1, 1, 14), sphGeo = new THREE.SphereGeometry(1, 16, 12);
        disposables.push(boxGeo, cylGeo, sphGeo);
        const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) => { const m = new THREE.Mesh(boxGeo, mat); m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); return m; };
        const cyl = (r: number, h: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) => { const m = new THREE.Mesh(cylGeo, mat); m.scale.set(r, h, r); m.position.set(x, y, z); parent.add(m); return m; };
        const ball = (r: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) => { const m = new THREE.Mesh(sphGeo, mat); m.scale.setScalar(r); m.position.set(x, y, z); parent.add(m); return m; };
        // Sky: golden-hour gradient dome, sun and drifting clouds
        const skyGeo = new THREE.SphereGeometry(300, 32, 16);
        const cols: number[] = [];
        const pos = skyGeo.attributes.position;
        const top = new THREE.Color(progress.cityLevel===3?0x07152f:0x18275c), mid = new THREE.Color(progress.cityLevel===2?0x9c4c9b:progress.cityLevel===3?0x253b69:0x6757a5), low = new THREE.Color(progress.cityLevel===3?0x527693:0xf49c83), tmp = new THREE.Color();
        for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i) / 300;
            if (y > .25)
                tmp.copy(mid).lerp(top, Math.min(1, (y - .25) / .6));
            else
                tmp.copy(low).lerp(mid, Math.max(0, y / .25));
            cols.push(tmp.r, tmp.g, tmp.b);
        }
        skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
        const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
        disposables.push(skyGeo, skyMat);
        const sky = new THREE.Mesh(skyGeo, skyMat);
        scene.add(sky);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff0b5, fog: false });
        disposables.push(sunMat);
        const sun = new THREE.Mesh(new THREE.CircleGeometry(16, 40), sunMat);
        sun.position.set(-30, 26, -250);
        scene.add(sun);
        const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffe9f0, fog: false, transparent: true, opacity: .92 });
        disposables.push(cloudMat);
        const clouds = [0, 1, 2, 3, 4].map(i => { const g = new THREE.Group(); [[0, 0, 5], [5, -1, 4], [-5, -1.3, 3.6], [2, 2, 3.8]].forEach(([x, y, r]) => { const m = new THREE.Mesh(sphGeo, cloudMat); m.scale.set(r, r * .6, r * .8); m.position.set(x, y, 0); g.add(m); }); g.position.set(-80 + i * 42, 50 + (i % 2) * 14, -170 - (i % 3) * 20); scene.add(g); return g; });
        scene.add(new THREE.HemisphereLight(0xfff1e6, 0x6c5ce7, 1.6));
        const sunLight = new THREE.DirectionalLight(0xffe0bd, 2.1);
        sunLight.position.set(-18, 30, 14);
        scene.add(sunLight);
        // One shared glossy asphalt material; avoid expensive reflection passes.
        const roadMaterial = new THREE.MeshStandardMaterial({color:0x222f49,roughness:.28,metalness:.25});
        disposables.push(roadMaterial);
        // Streets
        box(120, .4, 170, T(theme.ground), 0, -.3, -36);
        box(31, .06, 110, roadMaterial, 0, -.07, -30);
        for (const z of [-16, -36]) {
            box(80, .07, 8, roadMaterial, 0, -.04, z);
            for (let x = -36; x < 36; x += 3)
                box(1.2, .08, .9, B(0xffffff), x, -.02, z + 2.2);
        }
        for (const x of [-16, 16]) {
            box(.5, .26, 110, T(0xfff3e0), x, .05, -30);
            box(4, .1, 110, T(0xe8d9ff), x + Math.sign(x) * 2.3, -.02, -30);
        }
        for (let z = 12; z > -75; z -= 5.5)
            box(.22, .03, 2.4, B(0xffd43b), 0, -.02, z);
        for (const x of [-7.7, 7.7])
            for (let z = 12; z > -75; z -= 5.5)
                box(.12, .03, 2.4, B(0xffffff), x, -.02, z);
        // Buildings: saturated toon blocks with ink rooftops; window grid is one instanced mesh
        const winCount = 900;
        const winGeo = new THREE.PlaneGeometry(.9, 1);
        const winMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        disposables.push(winGeo, winMat);
        const windowsMesh = new THREE.InstancedMesh(winGeo, winMat, winCount);
        let wi = 0;
        const dummy = new THREE.Object3D();
        const unlitColor = new THREE.Color(0x3b3474), litColor = new THREE.Color(0xffe27a);
        const addWindow = (x: number, y: number, z: number, ry: number) => { if (wi >= winCount)
            return; dummy.position.set(x, y, z); dummy.rotation.set(0, ry, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); windowsMesh.setMatrixAt(wi, dummy.matrix); windowsMesh.setColorAt(wi, unlitColor); wi++; };
        const cameraBlockers: THREE.Mesh[] = [];
        const signs: THREE.Mesh[] = [];
        for (const side of [-1, 1])
            for (let i = 0; i < 13; i++) {
                const x = side * (24 + (i % 3) * .8), z = 12 - i * 6.9, h = (progress.cityLevel === 2 ? 5 : progress.cityLevel === 3 ? 14 : 8) + ((i * 7 + (side + 1) * 5) % 6) * (progress.cityLevel === 2 ? 1.5 : 3), color = progress.cityLevel === 1 ? PALETTE[(i + (side > 0 ? 3 : 0)) % PALETTE.length] : [theme.building,theme.roof,theme.accent][i%3];
                cameraBlockers.push(box(6.2, h, 5.6, T(color), x, h / 2, z));
                cameraBlockers.push(box(6.8, .6, 6.2, T(0x2b2f5e), x, h + .3, z));
                box(5.4, .3, 4.8, T(0xfff3e0), x, h + .7, z);
                if (i % 2) {
                    box(1.4, 1, 1.4, T(0xdfe6ff), x + 1.5, h + 1.3, z - 1);
                    cyl(.35, 1.4, T(0x9aa3c7), x - 1.6, h + 1.3, z + 1);
                }
                const face = x - side * 3.11;
                for (let y = 2.2; y < h - 1; y += 2.6)
                    for (let dz = -1.7; dz <= 1.7; dz += 1.7)
                        addWindow(face, y, z + dz, -side * Math.PI / 2);
                box(.2, 1.2, 5.8, T(0x2b2f5e), face - side * .05, 1.1, z);
                if (i % 3 === 1) {
                    const s = box(.25, 1.6, 3.4, T(0x5b4d8a), face - side * .2, Math.min(h - 2, 6), z);
                    signs.push(s);
                }
            }
        for (const side of [-1, 1])
            for (let i = 0; i < 8; i++) {
                const h = 22 + (i * 11) % 18;
                box(9, h, 9, T(PALETTE[(i + 2) % PALETTE.length]), side * 36, h / 2, 8 - i * 12);
                box(9.6, .8, 9.6, T(0x2b2f5e), side * 36, h + .4, 8 - i * 12);
            }
        windowsMesh.count = wi;
        windowsMesh.instanceMatrix.needsUpdate = true;
        if (windowsMesh.instanceColor)
            windowsMesh.instanceColor.needsUpdate = true;
        scene.add(windowsMesh);
        // Street furniture
        const lamps: THREE.Mesh[] = [];
        for (const side of [-1, 1])
            for (let z = 10; z > -70; z -= 13) {
                cyl(.1, 4.2, T(0x2b2f5e), side * 16.6, 2.1, z);
                box(1.1, .12, .25, T(0x2b2f5e), side * 16.1, 4.2, z);
                lamps.push(ball(.32, T(0x6b6590), side * 15.6, 4.05, z));
            }
        for (const side of [-1, 1])
            for (let z = 4; z > -70; z -= 11) {
                cyl(.18, 1.4, T(0x8a5a3c), side * 19, .7, z);
                ball(1.3, T(0x3fbf6a), side * 19, 2.3, z);
                ball(.9, T(0x62d98a), side * 19 + .4, 3.1, z + .2);
            }
        // Elevated rail + launch pad
        box(2.4, .5, 73, T(0x5b6bd6), -9.2, 5.2, -31);
        for (let z = 0; z > -66; z -= 9)
            cyl(.3, 5.1, T(0xfff3e0), -9.2, 2.6, z);
        for (const x of [-9.85, -8.55])
            box(.14, .12, 73, B(0xffd43b), x, 5.5, -31);
        const pad = cyl(1, .16, T(0xff4fa3, 0xff4fa3, .6), -9.2, .1, -5);
        const padRing = new THREE.Mesh(new THREE.TorusGeometry(1.25, .08, 8, 30), B(0xffffff));
        padRing.rotation.x = Math.PI / 2;
        padRing.position.set(-9.2, .25, -5);
        scene.add(padRing);
        disposables.push(padRing.geometry);
        const train = new THREE.Group();
        box(2.6, 2.2, 7, T(0xff5d73), 0, 0, 0, train);
        box(2.7, .8, 6.6, T(0xfff3e0), 0, .35, 0, train);
        for (const z of [-2.2, 0, 2.2])
            box(2.75, .6, 1.3, T(0x6fd3ff), 0, .4, z, train);
        box(2.7, .25, 7.1, T(0x2b2f5e), 0, -1.1, 0, train);
        train.position.set(-9.2, 6.7, -65);
        scene.add(train);
        const drones = [0, 1, 2].map(i => { const g = new THREE.Group(); box(.9, .3, .8, T(0xfff3e0), 0, 0, 0, g); box(1.9, .06, .18, T(0x2b2f5e), 0, .1, 0, g); ball(.18, B(0x6ff7ff), 0, -.2, .3, g); g.position.set(i % 2 ? 8 : -8, 9 + i * 2, -11 - i * 15); scene.add(g); return g; });
        const traffic = [0, 1, 2].map(i => { const g = new THREE.Group(); const c = [0xffc94d, 0x4fd6c8, 0xff7b8e][i]; box(1.7, .7, 3.2, T(c), 0, .55, 0, g); box(1.4, .55, 1.6, T(0xdff6ff), 0, 1.15, -.2, g); box(1.3, .2, .12, B(0xfff3b0), 0, .6, -1.62, g); for (const [x, z] of [[-.8, 1], [.8, 1], [-.8, -1], [.8, -1]]) {
            const w = cyl(.35, .3, T(0x2b2f5e), x, .35, z, g);
            w.rotation.z = Math.PI / 2;
        } g.position.set(i === 1 ? -4 : 4, 0, 9 - i * 20); scene.add(g); return g; });
        box(11, 6.5, 8, T(0xc98bff), 39, 3.2, -28);
        box(11.6, .5, 8.6, T(0xff4fa3), 39, 6.7, -28);
        const tower = new THREE.Group();
        cyl(4, 40, T(0x5b6bd6), 0, 20, -110, tower);
        cyl(3, 7, T(0x2b2f5e), 0, 43, -110, tower);
        const towerTop = cyl(2.2, 6, T(0x6b6590), 0, 49, -110, tower);
        cyl(.4, 14, T(0xfff3e0), 0, 58, -110, tower);
        scene.add(tower);
        const gen = new THREE.Group();
        cyl(3, .8, T(0x2b2f5e), 0, .45, -35, gen);
        cyl(1.6, 4, T(0xfff3e0), 0, 2.8, -35, gen);
        for (let k = 0; k < 4; k++) {
            const b = box(.3, 3.6, .3, T(0x5b6bd6), Math.cos(k * 1.57) * 1.65, 2.8, -35 + Math.sin(k * 1.57) * 1.65, gen);
            b.rotation.y = k;
        }
        const genCore = cyl(1.2, .5, T(0x6b6590), 0, 5, -35, gen);
        scene.add(gen);
        const genRing = new THREE.Mesh(new THREE.TorusGeometry(4, .12, 8, 48), B(0x6ff7ff));
        genRing.rotation.x = Math.PI / 2;
        genRing.position.set(0, .2, -35);
        scene.add(genRing);
        disposables.push(genRing.geometry);
        // Objectives
        const beamMat = new THREE.MeshBasicMaterial({ color: 0x6ff7ff, transparent: true, opacity: .22, depthWrite: false, blending: THREE.AdditiveBlending });
        const beamPink = beamMat.clone();
        beamPink.color.setHex(0xff7ad0);
        disposables.push(beamMat, beamPink);
        const beamGeo = new THREE.CylinderGeometry(.25, .9, 16, 12, 1, true);
        const crystalGeo = new THREE.OctahedronGeometry(.8);
        const coreGeo = new THREE.IcosahedronGeometry(.75);
        disposables.push(beamGeo, crystalGeo, coreGeo);
        const makeObjective = (x: number, z: number, geo: THREE.BufferGeometry, color: number, beam: THREE.Material) => { const g = new THREE.Group(); const gem = new THREE.Mesh(geo, T(color, color, .55)); gem.position.y = 1.9; g.add(gem); const ring = new THREE.Mesh(new THREE.TorusGeometry(1, .08, 6, 28), B(0xffffff)); ring.rotation.x = Math.PI / 2; ring.position.y = .15; g.add(ring); disposables.push(ring.geometry); const b = new THREE.Mesh(beamGeo, beam); b.position.y = 8; g.add(b); g.position.set(x, 0, z); scene.add(g); return g; };
        const cells = missions[0].points.map(([x, , z]) => makeObjective(x, z, crystalGeo, 0x49e6ff, beamMat));
        const metroStation = new THREE.Group();
        box(7.4, .35, 4.4, T(0xfff3e0), 0, .2, 0, metroStation);
        for (const x of [-3.2, 3.2])
            cyl(.22, 4, T(0x5b6bd6), x, 2.1, 0, metroStation);
        box(8, .4, 4.8, T(0xff5d73), 0, 4.2, 0, metroStation);
        const stationSign = box(6.4, .9, .3, T(0x6b6590), 0, 3.5, 2.3, metroStation);
        metroStation.position.set(-9, 0, -50);
        scene.add(metroStation);
        const metroCores = missions[1].points.map(([x, , z]) => { const g = makeObjective(x, z, coreGeo, 0xff5fc8, beamPink); g.visible = false; return g; });
        // Connected alley, accessible rooftop route and the power district.
        const surfaces = [{ x: 8, z: -18, w: 5, d: 5, y: 3 }, { x: 8, z: -26, w: 5, d: 6, y: 4 }, { x: 8, z: -35, w: 5, d: 6, y: 4 }, { x: 4, z: -41, w: 10, d: 5, y: 3 }];
        for (const roof of surfaces) {
            box(roof.w, roof.y, roof.d, T(0x465994), roof.x, roof.y / 2, roof.z);
            box(roof.w + .2, .16, roof.d + .2, T(0xdcecff), roof.x, roof.y + .08, roof.z);
        }
        const roofPad = cyl(1, .16, T(0x6ff7ff, 0x6ff7ff, .6), 8, .1, -12);
        const boulevardMat = T(0x304965) as THREE.MeshToonMaterial;
        box(30, .06, 8, boulevardMat, 16, -.01, -36);
        box(25, .06, 36, T(0x29344e), 12, -.01, -78);
        box(8, 4, 6, T(0x336a86), 27, 2, -36);
        const shopLight = box(7, .7, .2, T(0x344252), 27, 3.3, -32.8);
        const workshop = box(7, 3.8, 6, T(0x584363), 24, 1.9, -57);
        const workshopLight = box(6, .7, .2, T(0x344252), 24, 3, -53.8);
        const gate = box(20, 5, .5, T(0x25374c), 12, 2.5, -66);
        const districtLamp = box(18, .3, .7, T(0x344252), 12, 5.2, -66);
        const factory = box(10, 10, 8, T(0x446274), 12, 5, -86);
        cyl(1, 12, T(0x9aacbf), 19, 6, -87);
        const extra: Record<number, THREE.Group[]> = Object.fromEntries(missions.slice(2).map(m=>[m.id,m.points.map(([x,y,z])=>{const o=makeObjective(x,z,m.id===3||m.id===6?crystalGeo:coreGeo,m.id===3?0xffcf45:m.id===4?0xff5fc8:0x6ff7ff,m.id===4?beamPink:beamMat);o.position.y=y;return o;})]));
        const terminals:Record<number,THREE.Vector3> = terminalVectors;
        gen.position.set(terminals[1].x,0,terminals[1].z+35);
        genRing.position.copy(terminals[1]).setY(.2);
        metroStation.position.copy(terminals[2]);
        const terminalRings: Record<number, THREE.Mesh> = {};
        for (const id of [3, 4, 5, 6]) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(2, .1, 8, 32), B(0x6ff7ff));
            ring.rotation.x = Math.PI / 2;
            ring.position.copy(terminals[id]).add(new THREE.Vector3(0, .2, 0));
            scene.add(ring);
            terminalRings[id] = ring;
            disposables.push(ring.geometry);
        }
        const mechanic = new THREE.Group();
        box(.7, 1.1, .55, T(0xffcf45), 0, .65, 0, mechanic);
        ball(.3, T(0xe4f9ff), 0, 1.45, 0, mechanic);
        mechanic.position.fromArray(missions[4].points.at(-1)!);
        scene.add(mechanic);
        const shopUnlit = shopLight.material, workshopUnlit = workshopLight.material;
        let carriedCell: number | null = null;
        let escort = false, extraCelebrate = 0, runDone = false;
        const runFinish = new THREE.Vector3(0, 0, -50);
        // Collectible bolts: gold lightning shapes, instanced (Subway Surfers coin lines)
        const bs = new THREE.Shape();
        bs.moveTo(.1, .5);
        bs.lineTo(-.26, -.02);
        bs.lineTo(-.02, -.02);
        bs.lineTo(-.12, -.5);
        bs.lineTo(.27, .08);
        bs.lineTo(.03, .08);
        bs.lineTo(.1, .5);
        const boltGeo = new THREE.ExtrudeGeometry(bs, { depth: .12, bevelEnabled: true, bevelThickness: .04, bevelSize: .04, bevelSegments: 1 });
        boltGeo.center();
        disposables.push(boltGeo);
        const boltSpots: THREE.Vector3[] = [];
        const line = (x: number, z0: number, n: number, y = .9, dz = -2.2, arc = 0) => { for (let k = 0; k < n; k++)
            boltSpots.push(new THREE.Vector3(x, y + (arc ? Math.sin((k / (n - 1)) * Math.PI) * arc : 0), z0 + k * dz)); };
        line(0, 4, 6);
        line(-5, -2, 5);
        line(5, -12, 6);
        line(-9.2, -2, 6, .9, -2.2, 3.4);
        line(-9.2, -16, 14, 6.3);
        line(9, -26, 6);
        line(-3, -30, 5);
        line(4, -40, 6);
        line(-13, -38, 4);
        line(0, -46, 4, .9, -1.8, 2.5);
        const boltMesh = new THREE.InstancedMesh(boltGeo, T(0xffc629, 0xffa600, .45), boltSpots.length);
        scene.add(boltMesh);
        const boltTaken = boltSpots.map(() => false);
        // Particle bursts
        const partGeo = new THREE.IcosahedronGeometry(.13, 0);
        disposables.push(partGeo);
        const parts = Array.from({ length: 70 }, () => { const m = new THREE.Mesh(partGeo, B(0xffffff)); m.visible = false; scene.add(m); return { m, v: new THREE.Vector3(), life: 0 }; });
        let pIndex = 0;
        const burst = (at: THREE.Vector3, color: number, n: number, force = 5, up = 4) => { for (let k = 0; k < n; k++) {
            const p = parts[pIndex++ % parts.length];
            p.m.material = B(color);
            p.m.visible = true;
            p.m.position.copy(at);
            p.v.set((Math.random() - .5) * force, Math.random() * up + 1, (Math.random() - .5) * force);
            p.life = .55 + Math.random() * .35;
            p.m.scale.setScalar(.7 + Math.random() * .8);
        } };
        // BLU
        const blu = new BluRig();
        scene.add(blu.root);
        disposables.push(blu);
        const trail = [0, 1, 2, 3, 4].map(() => { const o = new THREE.Mesh(sphGeo, B(0x6ff7ff)); o.scale.setScalar(.12); scene.add(o); return o; });
        // Checkpoint
        for (const r of [{ x: 8, a: -10, b: -15, ya: 0, yb: 3 }, { x: 8, a: -20.5, b: -22.5, ya: 3, yb: 4 }, { x: 8, a: -29, b: -31.5, ya: 4, yb: 4 }, { x: 8, a: -38, b: -39, ya: 4, yb: 3 }]) {
            const ramp = box(2.5, .18, Math.hypot(r.a - r.b, r.yb - r.ya), T(0xffcf45), r.x, (r.ya + r.yb) / 2, (r.a + r.b) / 2);
            ramp.rotation.x = Math.atan2(r.yb - r.ya, r.a - r.b);
        }
        // Market stalls, civic facade and neighborhood shops define each district.
        if(progress.cityLevel===2){for(let i=0;i<6;i++){const z=-8-i*8;box(4,2.7,4,T(theme.building),-14,1.35,z);box(5,.3,5,T(theme.accent),-14,3,z);}}
        if(progress.cityLevel===3){box(15,8,8,T(0xc4cfe5),12,4,-74);for(const x of [6,10,14,18])cyl(.4,7,T(0xfff3de),x,3.5,-69.7);box(17,.8,9,T(theme.roof),12,8.4,-74);}
        const civicTraffic:THREE.MeshBasicMaterial[]=[];
        if(progress.cityLevel===3){
            for(const x of [-5,5]){cyl(.12,3.6,T(0x28394c),x,1.8,-17);const light=new THREE.MeshBasicMaterial({color:0x27384a});disposables.push(light);civicTraffic.push(light);box(.6,1.3,.4,T(0x17263c),x,3,-17);ball(.19,light,x,3.3,-16.7);}
            cyl(.7,15,T(0x7998b5),25,7.5,-64);for(const y of [9,12,15])box(5,.15,.4,T(theme.accent),25,y,-64);
        }
        const sponsorLights:{mission:number;material:THREE.MeshBasicMaterial;halo:THREE.Mesh;windows:THREE.Material}[]=[];
        let alive=true;
        for(const m of missions){
            const slot=SPONSOR_SLOTS.find(s=>s.city===progress.cityLevel&&s.mission===m.id);
            const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;
            const context=canvas.getContext('2d');
            if(context){
                const accent='#'+(slot?.color??theme.accent).toString(16).padStart(6,'0');
                context.fillStyle='#102440';context.fillRect(0,0,512,160);
                context.fillStyle=accent;context.fillRect(0,0,512,8);context.fillRect(0,152,512,8);
                // Every destination has a visible BLU emblem, including unassigned sponsor slots.
                context.fillRect(22,35,58,90);context.fillRect(39,23,24,12);
                context.fillStyle='#102440';context.beginPath();context.moveTo(57,46);context.lineTo(35,84);context.lineTo(51,84);context.lineTo(43,113);context.lineTo(69,72);context.lineTo(53,72);context.closePath();context.fill();
                context.fillStyle='#ffffff';context.textAlign='center';context.font='bold 30px sans-serif';context.fillText(slot?.name||m.names.en,295,78,400);
                context.fillStyle=accent;context.font='bold 18px sans-serif';context.fillText('BLU CITY • POWERED BY YOU',295,117,390);
            }
            const texture=new THREE.CanvasTexture(canvas);disposables.push(texture);
            const material=new THREE.MeshBasicMaterial({map:texture,color:0xffffff,side:THREE.DoubleSide});disposables.push(material);
            const sign=new THREE.Mesh(new THREE.PlaneGeometry(8,2.5),material);disposables.push(sign.geometry);
            sign.position.copy(terminals[m.id]).add(new THREE.Vector3(0,4.5,-4));scene.add(sign);
            const logo=localSponsorLogo(slot?.logo??null);
            if(logo)new THREE.TextureLoader().load(logo,loaded=>{if(!alive){loaded.dispose();return;}loaded.colorSpace=THREE.SRGBColorSpace;material.map=loaded;material.needsUpdate=true;disposables.push(loaded);},undefined,()=>{});
            const frontage=box(9,5,4,T(theme.building),sign.position.x,terminals[m.id].y+2.5,sign.position.z-2.1);
            cameraBlockers.push(frontage);
            const windows=new THREE.MeshBasicMaterial({color:0x20354b});disposables.push(windows);
            for(const side of [-1,1])box(2.8,1.8,.12,windows,sign.position.x+side*2.6,terminals[m.id].y+1.8,sign.position.z+.12);
            const halo=box(9.4,.18,.35,B(slot?.color??theme.accent),sign.position.x,sign.position.y+1.5,sign.position.z);
            sponsorLights.push({mission:m.id,material,halo,windows});
            // Lit frontage gives visible feedback at every completed business.
            box(6,.22,.5,T(slot?.color??theme.accent),sign.position.x,sign.position.y-1,sign.position.z);
        }
        const cityBanner=document.createElement('canvas');cityBanner.width=1024;cityBanner.height=192;
        const bannerContext=cityBanner.getContext('2d');
        if(bannerContext){bannerContext.fillStyle='#102440';bannerContext.fillRect(0,0,1024,192);bannerContext.fillStyle='#'+theme.accent.toString(16).padStart(6,'0');bannerContext.fillRect(0,176,1024,16);bannerContext.fillStyle='#fff';bannerContext.textAlign='center';bannerContext.font='bold 58px sans-serif';bannerContext.fillText(cityName(progress.cityLevel,'en').toUpperCase(),512,115,960);}
        const bannerTexture=new THREE.CanvasTexture(cityBanner);bannerTexture.colorSpace=THREE.SRGBColorSpace;
        const bannerMaterial=new THREE.MeshBasicMaterial({map:bannerTexture,side:THREE.DoubleSide});
        const bannerGeometry=new THREE.PlaneGeometry(19,3.6);disposables.push(bannerTexture,bannerMaterial,bannerGeometry);
        const banner=new THREE.Mesh(bannerGeometry,bannerMaterial);banner.position.set(0,8,-8);scene.add(banner);
        for(const x of [-10,10])box(.5,9,.5,T(theme.accent),x,4.5,-8);
        const worldScale = cityScale(progress.cityLevel);
        const world = new THREE.Group();
        for (const child of [...scene.children])
            if (child !== sky && child !== sun && !clouds.includes(child as THREE.Group) && !(child instanceof THREE.Light))
                world.add(child);
        scene.add(world);
        world.scale.set(worldScale, 1, worldScale);
        // The robot remains human sized while the city footprint grows.
        blu.root.scale.set(1 / worldScale, 1, 1 / worldScale);
        const found = [...progress.cells];
        let restored = progress.completed.includes(1) || serverRestored;
        const metroFound = [...progress.metro];
        let metroDone = progress.metroDone;
        let activeLevel: LevelId = mission === unlockedLevel(progress) ? mission : unlockedLevel(progress);
        // Complete older saves without granting a new reward for a mission finished before coins existed.
        if (restored && !progress.claimed.includes(1))
            progress = { ...progress, restored: true, claimed: [...progress.claimed, 1] };
        if (metroDone && !progress.claimed.includes(2))
            progress = { ...progress, claimed: [...progress.claimed, 2] };
        const save = () => { progress = checkpointProgress({ ...progress, cells: found, restored: progress.restored, metro: metroFound, metroDone }); };
        const award = (id: LevelId) => { save(); progress = dispatchProgress({ type: "finish", id }); };
        cells.forEach((c, i) => { c.visible = !found[i]; });
        metroCores.forEach((c, i) => { c.visible = activeLevel === 2 && !metroFound[i]; });
        const litMats = { lamp: B(0xfff3b0), sign: T(0xff4fa3, 0xff4fa3, 1), core: B(0x6ff7ff), station: T(0x6ff7ff, 0x6ff7ff, .9) };
        let litWindows = 0;
        const lightWindow = (i: number) => { windowsMesh.setColorAt(i, litColor); };
        const applyLights = (instant: boolean) => { genCore.material = litMats.core; towerTop.material = litMats.core; if (instant) {
            const goal = Math.floor(wi * progress.completed.length / 6);
            for (let i = 0; i < goal; i++)
                lightWindow(i);
            litWindows = goal;
            if (windowsMesh.instanceColor)
                windowsMesh.instanceColor.needsUpdate = true;
            lamps.forEach((l, i) => { if (i < lamps.length * progress.completed.length / 6)
                l.material = litMats.lamp; });
            signs.forEach((s, i) => { if (i < signs.length * progress.completed.length / 6)
                s.material = litMats.sign; });
        } };
        if (restored)
            applyLights(true);
        if (challenge) {
            genRing.visible = false;
        }
        if (metroDone)
            stationSign.material = litMats.station;
        const state = { pos: new THREE.Vector3(0, 0, 10), vy: 0, jumps: 0, speed: 0, energy: restored ? 65 : 0, dash: 0, slide: 0, over: 0, charge: 0, time: 0, lastHud: 0, restoreTime: 0, metroTime: 0, padReady: true, airborne: false, idle: 0, yaw: 0, shake: 0, bolts: 0, travelled: 0, onRail: false, railShown: false, secretShown: false };
        let hitCooldown = 0, sessionLevel = 0, chargeTarget = '';
        const key = new Set<string>();
        const down = (e: KeyboardEvent) => { key.add(e.code); if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
            e.preventDefault(); if (!startedRef.current && (e.code === 'Space' || e.code === 'Enter')) {
            input.current.start = true;
            return;
        } if (e.code === 'Space')
            input.current.jump = true; if (e.code === 'ShiftLeft')
            input.current.dash = true; if (e.code === 'ControlLeft' || e.code === 'KeyC')
            input.current.slide = true; if (e.code === 'KeyE')
            input.current.charge = true; };
        const up = (e: KeyboardEvent) => { key.delete(e.code); if (e.code === 'KeyE')
            input.current.charge = false; };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        const size = { w: 1, h: 1 };
        const resize = new ResizeObserver(() => { const w = mount.clientWidth, h = mount.clientHeight; if (!w || !h)
            return; size.w = w; size.h = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = 70; camera.updateProjectionMatrix(); });
        resize.observe(mount);
        // Floating text popups projected from world space
        const popup = (text: string, at: THREE.Vector3, kind = '') => { const layer = fx.current; if (!layer)
            return; const v = at.clone().project(camera); const el = document.createElement('div'); el.className = `pop ${kind}`; el.textContent = text; el.style.left = `${(v.x + 1) / 2 * size.w}px`; el.style.top = `${(1 - v.y) / 2 * size.h}px`; layer.append(el); el.addEventListener('animationend', () => el.remove()); };
        const pulseBolts = () => { const el = boltChip.current; if (!el)
            return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); };
        let last = performance.now();
        let frame = 0;
        const camPos = new THREE.Vector3(1.2, 2, 15.4);
        const look = new THREE.Vector3(0, 1.3, 10);
        const tmpV = new THREE.Vector3();
        const cameraRay = new THREE.Raycaster(), cameraTarget = new THREE.Vector3(), cameraDirection = new THREE.Vector3();
        const publish = () => {
            const remaining = challenge ? [] : activeLevel === 1 ? cells.filter((_, i) => !found[i]) : activeLevel === 2 ? metroCores.filter((_, i) => !metroFound[i]) : (extra[activeLevel] || []).filter((_, i) => !progress.objectives[activeLevel][i]);
            const target = challenge ? runFinish : activeLevel === 3 && carriedCell !== null ? terminals[3] : activeLevel === 5 && progress.objectives[5].every(Boolean) && !escort ? mechanic.position : remaining.length ? remaining.reduce((best, c) => c.position.distanceTo(state.pos) < best.position.distanceTo(state.pos) ? c : best).position : challenge ? runFinish : activeLevel === 1 ? terminals[1] : activeLevel === 2 ? terminals[2] : terminals[activeLevel];
            const dx = target.x - state.pos.x, dz = target.z - state.pos.z;
            setStatus({ carrying: carriedCell !== null, escorting: escort, escortReady: escort && mechanic.position.distanceTo(terminals[5]) < 5, nodeReady: activeLevel === 6 && extra[6].some((o, i) => !progress.objectives[6][i] && state.pos.distanceTo(o.position) < 1.8), completed: [...progress.completed], sync: getSyncStatus(), extraGot: progress.objectives[activeLevel].filter(Boolean).length, levelDone: progress.completed.includes(activeLevel), runTime: Math.round(state.time), runDone, cells: found.filter(Boolean).length, metroCells: metroFound.filter(Boolean).length, energy: Math.round(state.energy), meters: Math.round(Math.hypot(dx, dz) * worldScale), direction: Math.atan2(dx, -dz), restored, metroDone, level: activeLevel, coins: progress.coins, blu: progress.blu, dashLevel: progress.dashLevel, celebrating: (challenge ? runDone : progress.completed.includes(activeLevel)) && ((extraCelebrate > 0 && state.time - extraCelebrate < 3.6) || (state.restoreTime > 0 && state.time - state.restoreTime < 3.6) || (state.metroTime > 0 && state.time - state.metroTime < 3.6)), nearby: challenge ? state.pos.distanceTo(runFinish) < 4 : activeLevel > 2 ? state.pos.distanceTo(terminals[activeLevel]) < 4 : activeLevel === 2 ? terminalDistance(2) < 4.2 : terminalDistance(1) < 4.2, overcharge: state.over > 0, rail: state.onRail, secret: state.pos.x > 13 && state.pos.z < -23, charge: state.charge, dashing: state.dash > 0, score: Math.round(state.bolts * 10 + state.travelled), bolts: state.bolts, tutorial: startedRef.current && state.travelled < 6 });
        };
        const controlReset = () => {input.current.x=0;input.current.y=0;input.current.charge=false;};
        const animate = () => {
            frame = requestAnimationFrame(animate);
            const now = performance.now();
            const dt = Math.min((now - last) / 1000, .04);
            last = now;
            if (input.current.exchange) {
                input.current.exchange = false;
                progress = dispatchProgress({ type: "exchange" });
                publish();
            }
            if (input.current.upgrade) {
                input.current.upgrade = false;
                progress = dispatchProgress({ type: "dash" });
                publish();
            }
            if (document.hidden || pausedRef.current) {
                controlReset();
                return;
            }
            state.time += dt;
            const control = input.current;
            if (challenge && gestureRef.current && startedRef.current) {
                control.x = THREE.MathUtils.clamp((laneRef.current * 6 - state.pos.x) * .65, -1, 1);
                control.y = state.pos.z <= -49 || control.charge ? 0 : -1;
            }
            const playing = startedRef.current;
            if (control.start) {
                control.start = false;
                startedRef.current = true;
                setStarted(true);
                if (challenge) {
                    progress = dispatchProgress({ type: "run-start" });
                    state.time = 0;
                    state.bolts = 0;
                }
            }
            if (control.next && progress.completed.includes(activeLevel)) {
                control.next = false;
                if (activeLevel < 6)
                    activeLevel = (activeLevel + 1) as LevelId;
                else {
                    if(progress.cityLevel<CAMPAIGN_CITY_COUNT)progress = dispatchProgress({ type: 'next-city' });
                    onMenu();
                    return;
                }
                sessionLevel = 0;
                metroCores.forEach((c, i) => { c.visible = activeLevel === 2 && !metroFound[i]; });
                state.charge = 0;
                control.charge = false;
                carriedCell = null;
                extraCelebrate = 0;
                state.restoreTime = 0;
                state.metroTime = 0;
                publish();
            }
            setMissionPosition(state.pos);
            if (playing && !challenge && sessionLevel !== activeLevel && !progress.completed.includes(activeLevel)) {
                progress = dispatchProgress({ type: 'mission-start', id: activeLevel });
                sessionLevel = activeLevel;
            }
            let horizontal = 0, forward = 0;
            if (playing) {
                horizontal = THREE.MathUtils.clamp(control.x + Number(key.has('KeyD') || key.has('ArrowRight')) - Number(key.has('KeyA') || key.has('ArrowLeft')), -1, 1);
                forward = THREE.MathUtils.clamp(-control.y + Number(key.has('KeyW') || key.has('ArrowUp')) - Number(key.has('KeyS') || key.has('ArrowDown')), -1, 1);
                if (control.dash && state.dash <= 0 && state.energy >= 12) {
                    state.dash = .34 + progress.dashLevel * .1;
                    state.energy -= 12;
                    state.shake = .15;
                }
                if (control.slide && state.pos.y < .1)
                    state.slide = .6;
                if (control.jump && state.jumps < 2) {
                    state.vy = state.jumps ? 9.5 : 10.8;
                    state.jumps++;
                    state.airborne = true;
                    blu.jump(state.jumps === 2);
                    if (state.jumps === 2)
                        popup(tRef.current.flip, tmpV.copy(state.pos).setY(state.pos.y + 3), 'small');
                }
            }
            control.dash = false;
            control.slide = false;
            control.jump = false;
            state.dash = Math.max(0, state.dash - dt);
            state.slide = Math.max(0, state.slide - dt);
            state.over = Math.max(0, state.over - dt);
            const rail = Math.abs(state.pos.x + 9.2) < 1.2 && state.pos.z < -4 && state.pos.z > -65;
            const move = new THREE.Vector3(horizontal, 0, -forward);
            const mag = Math.min(1, move.length());
            if (mag > 0)
                move.normalize();
            progress = getProgress();
            restored = progress.completed.includes(1);
            metroDone = progress.completed.includes(2);
            progress.cells.forEach((v, i) => found[i] = v);
            progress.metro.forEach((v, i) => metroFound[i] = v);
            cells.forEach((o, i) => o.visible = !challenge && activeLevel === 1 && !found[i]);
            metroCores.forEach((o, i) => o.visible = !challenge && activeLevel === 2 && !metroFound[i]);
            genRing.visible = !challenge && activeLevel === 1 && !restored;
            const targetSpeed = (state.dash > 0 ? 21 : state.over > 0 ? 14.5 : state.onRail ? 13 : progress.inventory.includes('shoes') ? 10.35 : 9) * (state.dash > 0 ? 1 : mag);
            state.speed = THREE.MathUtils.damp(state.speed, targetSpeed, 9, dt);
            const dir = state.dash > 0 && mag < .1 ? new THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw)) : move;
            const before = state.pos.clone();
            state.pos.x = THREE.MathUtils.clamp(state.pos.x + dir.x * state.speed * dt / worldScale, -17, 32);
            state.pos.z = THREE.MathUtils.clamp(state.pos.z + dir.z * state.speed * dt / worldScale, -96, 18);
            if (activeLevel < 6 && state.pos.z < -62)
                state.pos.z = -62;
            state.travelled += Math.hypot(state.pos.x - before.x, state.pos.z - before.z) * .5;
            const onPad = Math.hypot(state.pos.x + 9.2, state.pos.z + 5) < 1.1;
            if (onPad && state.pos.y < .15 && state.padReady && playing) {
                state.vy = 17;
                state.jumps = 1;
                state.padReady = false;
                state.airborne = true;
                blu.jump(false);
                burst(tmpV.set(-9.2, .3, -5), 0xff4fa3, 14, 6, 6);
            }
            if (!onPad && Math.hypot(state.pos.x - 8, state.pos.z + 12) > 1.2)
                state.padReady = true;
            // A continuous rooftop route is accessible without perfectly timed double jumps.
            const ramps = [{ x: 8, a: -10, b: -15, ya: 0, yb: 3 }, { x: 8, a: -20.5, b: -22.5, ya: 3, yb: 4 }, { x: 8, a: -29, b: -31.5, ya: 4, yb: 4 }, { x: 8, a: -38, b: -39, ya: 4, yb: 3 }];
            for (const r of ramps) {
                if (Math.abs(state.pos.x - r.x) < 1.25 && state.pos.z <= r.a && state.pos.z >= r.b - .6) {
                    const y = THREE.MathUtils.lerp(r.ya, r.yb, Math.min(1, (r.a - state.pos.z) / (r.a - r.b)));
                    if (state.pos.y >= y - .65 && state.pos.y <= y + .3 && state.vy <= 0) {
                        state.pos.y = y;
                        state.vy = 0;
                        state.jumps = 0;
                    }
                }
            }
            const vyBefore = state.vy;
            state.vy -= 28 * dt;
            state.pos.y = Math.max(0, state.pos.y + state.vy * dt);
            for (const roof of surfaces) {
                if (Math.abs(state.pos.x - roof.x) < roof.w / 2 + .2 && Math.abs(state.pos.z - roof.z) < roof.d / 2 + .2) {
                    if (state.vy <= 0 && before.y >= roof.y - .25 && state.pos.y <= roof.y) {
                        state.pos.y = roof.y;
                        state.vy = 0;
                        state.jumps = 0;
                    }
                    else if (state.pos.y < roof.y - .3) {
                        state.pos.x = before.x;
                        state.pos.z = before.z;
                    }
                }
            }
            if (Math.hypot(state.pos.x - 8, state.pos.z + 12) < 1.1 && state.pos.y < .15 && state.padReady && playing) {
                state.vy = 17;
                state.jumps = 1;
                state.padReady = false;
                blu.jump(false);
            }
            state.onRail = false;
            if (rail && state.pos.y < 5.05 && state.pos.y > 1.2 && state.vy <= 0) {
                state.pos.y = 5.1;
                state.vy = 0;
                state.jumps = 0;
                state.onRail = true;
            }
            else if (rail && Math.abs(state.pos.y - 5.1) < .01) {
                state.pos.y = 5.1;
                state.vy = 0;
                state.jumps = 0;
                state.onRail = true;
            }
            if (state.pos.y <= 0) {
                state.vy = 0;
                state.jumps = 0;
            }
            const grounded = state.pos.y <= 0 || state.onRail || state.vy === 0;
            if (grounded && state.airborne) {
                state.airborne = false;
                blu.land(-vyBefore);
                if (-vyBefore > 12) {
                    state.shake = Math.max(state.shake, .22);
                    burst(tmpV.copy(state.pos).setY(state.pos.y + .1), 0xffffff, 10, 5, 1.5);
                }
                navigator.vibrate?.(12);
            }
            if (state.onRail && !state.railShown) {
                state.railShown = true;
                popup(tRef.current.rail, tmpV.copy(state.pos).setY(state.pos.y + 3), 'small');
            }
            if (!rail)
                state.railShown = false;
            const secret = state.pos.x > 13 && state.pos.z < -23;
            if (secret && !state.secretShown) {
                state.secretShown = true;
                popup(tRef.current.secret, tmpV.copy(state.pos).setY(3), 'small');
            }
            // Facing: run direction; when idle BLU turns to the camera and looks around
            if (mag > .05 || state.dash > 0) {
                state.idle = 0;
                if (mag > .05)
                    state.yaw = Math.atan2(move.x, move.z);
            }
            else
                state.idle += dt;
            const celebrating = (extraCelebrate > 0 && state.time - extraCelebrate < 3.6) || (state.restoreTime > 0 && state.time - state.restoreTime < 3.6) || (state.metroTime > 0 && state.time - state.metroTime < 3.6);
            const faceCam = !playing || celebrating || state.idle > 2.2;
            const activationNode = activeLevel === 6 ? extra[6].findIndex((o, i) => !progress.objectives[6][i] && state.pos.distanceTo(o.position) < 1.8) : -1;
            const charging = playing && control.charge && (!challenge && activationNode >= 0 || (!challenge && activeLevel > 2 && !progress.completed.includes(activeLevel) && progress.objectives[activeLevel].every(Boolean) && state.pos.distanceTo(terminals[activeLevel]) < 4 && (activeLevel !== 5 || escort && mechanic.position.distanceTo(terminals[5]) < 5)) || (challenge && !runDone && state.bolts >= 20 && state.time >= 20 && state.pos.distanceTo(runFinish) < 4) || (!challenge && (activeLevel === 1 && found.every(Boolean) && !restored && terminalDistance(1) < 4.2) || (!challenge && activeLevel === 2 && !metroDone && metroFound.every(Boolean) && terminalDistance(2) < 4.2)));
            blu.root.position.copy(state.pos);
            blu.update(dt, { speed: Math.min(1, state.speed / 9), grounded, vy: state.vy, sliding: state.slide > 0, dashing: state.dash > 0, charging, celebrating, overcharge: state.over > 0, waving: !playing || (state.idle > 4 && state.idle % 6 < 1.6), yaw: faceCam ? 0 : state.yaw });
            blu.setEnergy(state.energy);
            blu.setEquipment(progress);
            const shadow = blu.root.getObjectByName('shadow');
            if (shadow) {
                shadow.position.y = (state.onRail ? 0 : -state.pos.y) + .03;
                shadow.scale.setScalar(Math.max(.4, 1 - state.pos.y * .06));
            }
            setMissionPosition(state.pos);
            const chargingTarget = charging && !challenge ? `${activeLevel}:${activationNode}` : '';
            if (chargingTarget && chargingTarget !== chargeTarget)
                progress = dispatchProgress({ type: 'mission-charge', id: activeLevel, ...(activationNode >= 0 ? { index: activationNode } : {}) });
            chargeTarget = chargingTarget;
            // Collectibles
            const spin = state.time * 3;
            for (let i = 0; i < boltSpots.length; i++) {
                const p = boltSpots[i];
                if (!boltTaken[i] && playing && Math.abs(p.x - state.pos.x) < 1.1 && Math.abs(p.z - state.pos.z) < 1.1 && Math.abs(p.y - (state.pos.y + .9)) < 1.4) {
                    boltTaken[i] = true;
                    state.bolts++;
                    state.energy = Math.min(100, state.energy + 3);
                    if (state.energy >= 100 && state.over === 0)
                        state.over = progress.inventory.includes('battery') ? 10 : 7;
                    burst(p, 0xffd43b, 5, 3, 3);
                    pulseBolts();
                    navigator.vibrate?.(6);
                }
                dummy.position.set(p.x, p.y + Math.sin(state.time * 4 + i * .5) * .12, p.z);
                dummy.rotation.set(0, spin + i * .2, 0);
                dummy.scale.setScalar(boltTaken[i] ? 0 : 1.15);
                dummy.updateMatrix();
                boltMesh.setMatrixAt(i, dummy.matrix);
            }
            boltMesh.instanceMatrix.needsUpdate = true;
            for (let i = 0; i < cells.length; i++) {
                const gem = cells[i].children[0];
                gem.rotation.y += dt * 1.8;
                gem.position.y = 1.9 + Math.sin(state.time * 3 + i) * .2;
                if (playing && activeLevel === 1 && !found[i] && Math.hypot(state.pos.x - cells[i].position.x, state.pos.z - cells[i].position.z) < 1.8 && state.pos.y < 3.5) {
                    found[i] = true;
                    cells[i].visible = false;
                    state.energy = Math.min(100, state.energy + 35);
                    if (state.energy >= 100) {
                        state.over = progress.inventory.includes("battery") ? 10 : 7;
                        state.energy = 100;
                        popup(tRef.current.overcharge, tmpV.copy(cells[i].position).setY(4), 'big');
                    }
                    else
                        popup(tRef.current.cell, tmpV.copy(cells[i].position).setY(3.5));
                    burst(tmpV.copy(cells[i].position).setY(1.9), 0x6ff7ff, 22, 7, 6);
                    save();
                    navigator.vibrate?.(35);
                    publish();
                }
            }
            for (let i = 0; i < 2; i++) {
                const core = metroCores[i];
                core.children[0].rotation.y += dt * 1.4;
                if (playing && activeLevel === 2 && !metroFound[i] && Math.hypot(state.pos.x - core.position.x, state.pos.z - core.position.z) < 1.8) {
                    metroFound[i] = true;
                    core.visible = false;
                    state.energy = Math.min(100, state.energy + 35);
                    popup(tRef.current.core, tmpV.copy(core.position).setY(3.5));
                    burst(tmpV.copy(core.position).setY(1.6), 0xff7ad0, 22, 7, 6);
                    save();
                    navigator.vibrate?.(35);
                    publish();
                }
            }
            if (charging && !challenge && activeLevel === 1) {
                state.charge = Math.min(1, state.charge + dt / (progress.inventory.includes("gloves") ? 1.12 : 1.6));
                if (Math.random() < .5)
                    burst(tmpV.set((Math.random() - .5) * 5, .3, -35 + (Math.random() - .5) * 5), 0x6ff7ff, 1, 1, 7);
                if (state.charge >= 1) {
                    restored = true;
                    state.restoreTime = state.time;
                    state.shake = .5;
                    award(1);
                    applyLights(false);
                    burst(tmpV.set(0, 5, -35), 0xffe27a, 40, 16, 10);
                    callbacks.current.onReward();
                    navigator.vibrate?.([40, 30, 90]);
                    publish();
                }
            }
            else if (charging && !challenge && activeLevel === 2) {
                state.charge = Math.min(1, state.charge + dt / (progress.inventory.includes("gloves") ? 1.05 : 1.5));
                if (state.charge >= 1) {
                    metroDone = true;
                    state.metroTime = state.time;
                    state.shake = .4;
                    stationSign.material = litMats.station;
                    burst(tmpV.set(-9, 4, -50), 0xff7ad0, 36, 14, 9);
                    award(2);
                    applyLights(true);
                    navigator.vibrate?.([40, 30, 90]);
                    publish();
                }
            }
            else if (charging && activationNode >= 0) {
                state.charge = Math.min(1, state.charge + dt / 1.5);
                if (state.charge >= 1) {
                    progress = dispatchProgress({ type: 'collect', id: 6, index: activationNode });
                    state.charge = 0;
                    control.charge = false;
                    publish();
                }
            }
            else if (charging && (activeLevel > 2 || challenge)) {
                state.charge = Math.min(1, state.charge + dt / (progress.inventory.includes('gloves') ? 1.05 : 1.5));
                if (state.charge >= 1) {
                    if (challenge) {
                        const before = progress.runs;
                        progress = dispatchProgress({ type: 'run-finish', bolts: state.bolts });
                        runDone = progress.runs > before;
                    }
                    else {
                        award(activeLevel);
                        applyLights(true);
                    }
                    extraCelebrate = state.time;
                    state.shake = .4;
                    burst(tmpV.copy(state.pos).setY(state.pos.y + 2), 0x6ff7ff, 35, 14, 8);
                    publish();
                }
            }
            else
                state.charge = Math.max(0, state.charge - dt * 1.5);
            if (state.restoreTime > 0 && litWindows < wi) {
                const goal = Math.min(Math.floor(wi * progress.completed.length / 6), Math.floor((state.time - state.restoreTime) * 160));
                for (; litWindows < goal; litWindows++)
                    lightWindow(litWindows);
                if (windowsMesh.instanceColor)
                    windowsMesh.instanceColor.needsUpdate = true;
                lamps.forEach((l, i) => { if (i < Math.min(lamps.length * progress.completed.length / 6, (state.time - state.restoreTime) * 8))
                    l.material = litMats.lamp; });
                signs.forEach((s, i) => { if (i < Math.min(signs.length * progress.completed.length / 6, (state.time - state.restoreTime) * 3))
                    s.material = litMats.sign; });
            }
            for (const id of [3, 4, 5, 6]) {
                extra[id].forEach((o, i) => { o.visible = !challenge && activeLevel === id && !progress.objectives[id][i] && !(id === 3 && carriedCell === i); o.children[0].rotation.y += dt * 2; if (o.visible && playing && id !== 6 && state.pos.distanceTo(o.position) < 1.8) {
                    if (id === 3) {
                        if (carriedCell === null) {
                            progress = dispatchProgress({ type: 'mission-pickup', id: 3, index: i });
                            carriedCell = i;
                        }
                        publish();
                        return;
                    }
                    progress = dispatchProgress({ type: 'collect', id, index: i });
                    state.energy = Math.min(100, state.energy + 35);
                    if (state.energy >= 100)
                        state.over = progress.inventory.includes('battery') ? 10 : 7;
                    burst(tmpV.copy(o.position).setY(o.position.y + 1.8), 0x6ff7ff, 18, 6, 6);
                    publish();
                } });
                terminalRings[id].visible = !challenge && activeLevel === id && !progress.completed.includes(id) && (progress.objectives[id].every(Boolean) || id === 3 && carriedCell !== null);
            }
            if (activeLevel === 3 && carriedCell !== null && state.pos.distanceTo(terminals[3]) < 2) {
                const index = carriedCell;
                progress = dispatchProgress({ type: 'collect', id: 3, index });
                if (progress.objectives[3][index])
                    carriedCell = null;
                publish();
            }
            if (activeLevel === 5 && !escort && progress.objectives[5].every(Boolean) && state.pos.distanceTo(mechanic.position) < 4) {
                progress = dispatchProgress({ type: 'mission-escort', id: 5 });
                escort = true;
            }
            if (escort && !progress.completed.includes(5)) {
                const target = state.pos.clone();
                target.y = 0;
                mechanic.position.lerp(target, 1 - Math.exp(-2 * dt));
                mechanic.rotation.y = Math.atan2(target.x - mechanic.position.x, target.z - mechanic.position.z);
            }
            mechanic.visible = activeLevel === 5 || progress.completed.includes(5);
            if (progress.completed.includes(5))
                mechanic.position.copy(terminals[5]).add(new THREE.Vector3(0,0,-1));
            civicTraffic.forEach(m=>m.color.setHex(progress.completed.includes(1)?0x54ff8c:0x27384a));
            sponsorLights.forEach(s=>{
                const complete=progress.completed.includes(s.mission as LevelId);
                s.material.color.setHex(0xffffff);
                (s.windows as THREE.MeshBasicMaterial).color.setHex(complete?0xffedac:0x20354b);
                s.halo.scale.y=complete?1:activeLevel===s.mission?1+.3*Math.sin(state.time*4):1;
            });
            shopLight.material = progress.completed.includes(3) ? litMats.station : shopUnlit;
            workshopLight.material = progress.completed.includes(5) ? litMats.sign : workshopUnlit;
            gate.visible = !progress.completed.includes(6);
            districtLamp.material = progress.completed.includes(6) ? litMats.core : T(0x344252);
            if (progress.inventory.includes('street')) {
                boulevardMat.color.setHex(0x603d94);
                signs.forEach(s => s.material = litMats.sign);
            }
            // Ambient life
            hitCooldown = Math.max(0, hitCooldown - dt);
            if (playing && hitCooldown === 0 && state.pos.y < 1 && state.dash === 0 && state.over === 0 && traffic.some(v => Math.abs(v.position.x - state.pos.x) < 1.2 && Math.abs(v.position.z - state.pos.z) < 1.8)) {
                state.energy = Math.max(0, state.energy - 15);
                state.pos.x = THREE.MathUtils.clamp(state.pos.x + (state.pos.x >= 0 ? -2 : 2), -17, 32);
                state.shake = .4;
                hitCooldown = 1.5;
                burst(tmpV.copy(state.pos).setY(1), 0xff664f, 12);
            }
            train.position.z = metroDone && (state.restoreTime === 0 || state.time - state.restoreTime > 2) ? -65 + (state.time * 10 % 90) : -65;
            drones.forEach((d, i) => { d.position.x = (i % 2 ? 8 : -8) + Math.sin(state.time * .7 + i) * 2.4; d.position.y = 9 + i * 2 + Math.sin(state.time * 1.9 + i) * .5; d.rotation.y = Math.sin(state.time * .7 + i) * .4; });
            traffic.forEach((v, i) => { v.position.z = 14 - ((state.time * (6 + i * 1.5) + i * 24) % 70); });
            clouds.forEach((c, i) => { c.position.x = ((c.position.x + dt * (1 + i * .3) + 120) % 240) - 120; });
            pad.rotation.y += dt;
            padRing.scale.setScalar(1 + (state.time * 1.5 % 1) * .5);
            (padRing.material as THREE.MeshBasicMaterial).opacity = 1;
            genRing.visible = challenge ? (!runDone && state.bolts >= 20) : activeLevel === 1 && !restored && found.every(Boolean);
            if (challenge)
                genRing.position.copy(runFinish).setY(.2);
            genRing.scale.setScalar(1 + Math.sin(state.time * 4) * .05);
            for (const p of parts)
                if (p.life > 0) {
                    p.life -= dt;
                    p.v.y -= 14 * dt;
                    p.m.position.addScaledVector(p.v, dt);
                    p.m.rotation.x += dt * 6;
                    if (p.life <= 0)
                        p.m.visible = false;
                    else
                        p.m.scale.multiplyScalar(.985);
                }
            trail.forEach((o, i) => { o.visible = state.over > 0 || state.dash > 0; o.position.set(state.pos.x - Math.sin(state.yaw) * (.6 + i * .45) + Math.sin(state.time * 12 + i) * .2, state.pos.y + .8 + Math.sin(state.time * 9 + i) * .25, state.pos.z - Math.cos(state.yaw) * (.6 + i * .45)); o.scale.setScalar(.14 - i * .02); });
            // Camera: title shot in front of BLU, then chase camera
            // Simulation coordinates scale with the city; camera distances do not.
            const playerX = state.pos.x * worldScale, playerZ = state.pos.z * worldScale;
            const desired = playing ? tmpV.set(playerX, state.pos.y + 3.8 + (state.vy > 0 ? .3 : 0), playerZ + (state.dash > 0 ? 7 : 6.4)) : tmpV.set(playerX + 1.4 + Math.sin(state.time * .3) * .5, 2.1, playerZ + 5.6);
            camPos.lerp(desired, 1 - Math.exp(-(playing ? 10 : 2.5) * dt));
            const lookGoal = playing ? new THREE.Vector3(playerX, state.pos.y + 1.4, playerZ - 1) : new THREE.Vector3(playerX - .9, 1.55, playerZ - 4);
            look.lerp(lookGoal, 1 - Math.exp(-(playing ? 10 : 5) * dt));
            state.shake = Math.max(0, state.shake - dt);
            const sh = state.shake * .5;
            camera.position.set(camPos.x + (Math.random() - .5) * sh, camPos.y + (Math.random() - .5) * sh, camPos.z);
            if (playing) {
                world.updateMatrixWorld(true);
                cameraTarget.set(playerX, state.pos.y + 1.1, playerZ);
                cameraDirection.copy(camera.position).sub(cameraTarget);
                const distance = cameraDirection.length();
                cameraRay.set(cameraTarget, cameraDirection.normalize());
                cameraRay.far = distance;
                const obstruction = cameraRay.intersectObjects(cameraBlockers, false)[0];
                if (obstruction) camera.position.copy(cameraTarget).addScaledVector(cameraDirection, Math.max(.6, obstruction.distance - .35));
            }
            camera.lookAt(look);
            const fovBase = 70;
            camera.fov = THREE.MathUtils.damp(camera.fov, fovBase + (state.dash > 0 || state.over > 0 ? 4 : 0), 5, dt);
            camera.updateProjectionMatrix();
            sky.position.copy(camera.position);
            if (state.time - state.lastHud > .15) {
                state.lastHud = state.time;
                publish();
            }
            renderer.render(scene, camera);
        };
        publish();
        animate();
        return () => { alive=false; cancelAnimationFrame(frame); resize.disconnect(); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); mats.forEach(m => m.dispose()); disposables.forEach(d => d.dispose()); windowsMesh.dispose(); boltMesh.dispose(); renderer.dispose(); renderer.domElement.remove(); };
    }, [serverRestored, challenge, mission]);
    // Touch: swipe up = jump, down = slide, sideways = dash (anywhere on the stage)
    useEffect(() => { try { setGestureMode(localStorage.getItem('blu_gestures') === '1'); } catch {} }, []);
    const lastTap = useRef(0);
    const touch = useRef<{ x: number; y: number; moved: boolean } | null>(null);
    const onTouchStart = (e: React.TouchEvent) => {
        const p=e.touches[0];touch.current={x:p.clientX,y:p.clientY,moved:false};
        if(gestureMode && canCharge) input.current.charge=true;
    };
    const onTouchMove = (e: React.TouchEvent) => {
        if(!touch.current || !gestureMode)return;
        const p=e.touches[0],dx=p.clientX-touch.current.x,dy=p.clientY-touch.current.y;
        if(Math.hypot(dx,dy)>20){touch.current.moved=true;input.current.charge=false;}
        // Story missions keep full two-axis travel with a floating touch origin.
        if(!challenge){input.current.x=Math.max(-1,Math.min(1,dx/65));input.current.y=Math.max(-1,Math.min(1,dy/65));}
    };
    const onTouchEnd = (e: React.TouchEvent) => {
        if(!touch.current)return;
        const p=e.changedTouches[0],dx=p.clientX-touch.current.x,dy=p.clientY-touch.current.y;
        if(Math.abs(dy)>35 && Math.abs(dy)>Math.abs(dx)) input.current[dy<0?'jump':'slide']=true;
        else if(Math.abs(dx)>35){if(challenge&&gestureMode)laneRef.current=Math.max(-1,Math.min(1,laneRef.current+(dx>0?1:-1)));else if(!gestureMode)input.current.dash=true;}
        if(gestureMode && !touch.current.moved && !canCharge){const now=performance.now();if(now-lastTap.current<280)input.current.dash=true;lastTap.current=now;}
        input.current.charge=false;input.current.x=0;input.current.y=0;touch.current=null;
    };
    const cancelTouch=()=>{touch.current=null;input.current.charge=false;input.current.x=0;input.current.y=0;};
    const stick = (e: React.PointerEvent<HTMLDivElement>) => { const r = e.currentTarget.getBoundingClientRect(); let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2); const l = Math.hypot(x, y); if (l > 1) {
        x /= l;
        y /= l;
    } input.current.x = x; input.current.y = y; if (knob.current)
        knob.current.style.transform = `translate(${x * 32}px, ${y * 32}px)`; };
    const release = () => { input.current.x = 0; input.current.y = 0; if (knob.current)
        knob.current.style.transform = ''; };
    const hold = (on: boolean) => () => { input.current.charge = on; };
    const extended = localized(lang, { en: { collect: "Collect the marked energy", charge: "Hold Charge at the beacon", go: "Reach the marked destination", done: "Mission complete!", next: "Continue", run: "Collect 20 bolts, then charge the finish beacon", escort: "Lead the robot to the workshop" }, he: { collect: "אסוף את האנרגיה המסומנת", charge: "החזק טעינה בנקודת הסיום", go: "הגע ליעד המסומן", done: "המשימה הושלמה!", next: "ממשיכים", run: "אסוף 20 ברקים וטען את נקודת הסיום", escort: "לווה את הרובוט לסדנה" }, ar: { collect: "اجمع الطاقة المعلّمة", charge: "اضغط الشحن عند النهاية", go: "وصل للهدف المعلّم", done: "المهمة اكتملت!", next: "كمّل", run: "اجمع 20 برق واشحن نقطة النهاية", escort: "رافق الروبوت للورشة" } });
    const missionPrompts = localized(lang, { he: ['קח תא אנרגיה אחד והבא אותו לחנות · 3 משלוחים', 'התא בידך — הבא אותו לטבעת החנות', 'עלה לגגות ואסוף 3 ליבות רחפן', 'אסוף 2 כלי תיקון', 'גש לרובוט כדי שיתחיל לעקוב אחריך', 'החזק טעינה ליד כל אחת מ־3 נקודות הכוח'], en: ['Pick up one cell and deliver it to the shop · 3 deliveries', 'Carrying a cell — deliver it to the shop ring', 'Climb the roofs and collect 3 drone cores', 'Collect 2 repair tools', 'Meet the robot to start the escort', 'Hold Charge at each of the 3 power nodes'], ar: ['خذ خلية ووصلها للدكان · 3 توصيلات', 'معك خلية — وصلها لحلقة الدكان', 'اصعد للسطوح واجمع 3 نوى', 'اجمع أداتي تصليح', 'اقترب من الروبوت ليبدأ بمرافقتك', 'اضغط الشحن عند كل نقطة من نقاط الطاقة الثلاث'] });
    const objective = !challenge && !status.levelDone && status.level === 3 && status.extraGot < cityMissions(city)[2].required ? missionPrompts[status.carrying ? 1 : 0] : !challenge && !status.levelDone && status.level === 4 && status.extraGot < cityMissions(city)[3].required ? missionPrompts[2] : !challenge && !status.levelDone && status.level === 5 ? (status.extraGot < cityMissions(city)[4].required ? missionPrompts[3] : status.nearby && status.escortReady ? extended.charge : status.escorting ? extended.escort : missionPrompts[4]) : !challenge && !status.levelDone && status.level === 6 && status.extraGot < cityMissions(city)[5].required ? missionPrompts[5] : challenge ? status.runDone ? extended.done : status.bolts < 20 ? extended.run : status.runTime < 20 ? (translateValue(lang, lang === 'he' ? 'המתן עד 20 שניות ואז טען את הסיום' : translateValue(lang, lang === 'ar' ? 'انتظر 20 ثانية ثم اشحن النهاية' : 'Wait until 20 seconds, then charge the finish'))) : status.nearby ? extended.charge : extended.go : status.level > 2 ? status.levelDone ? extended.done : status.extraGot < cityMissions(city)[status.level - 1].required ? extended.collect : status.level === 5 ? extended.escort : status.nearby ? extended.charge : extended.go : status.level === 1 ? status.restored ? t.done : status.cells < 3 ? t.collect : status.nearby ? t.charge : t.generator : status.metroDone ? t.metroDone : status.metroCells < 2 ? t.metroCollect : status.nearby ? t.metroCharge : t.metroStation;
    const cityLevels=cityMissions(city);
    const total = challenge ? 20 : cityLevels[status.level - 1].required, got = challenge ? status.bolts : status.level > 2 ? status.extraGot : status.level === 1 ? status.cells : status.metroCells;
    const canCharge = challenge ? status.nearby && status.bolts >= 20 && status.runTime >= 20 && !status.runDone : status.nodeReady || status.nearby && (status.level !== 5 || status.escortReady) && (status.level > 2 ? !status.levelDone && status.extraGot === total : status.level === 1 ? !status.restored && status.cells === 3 : !status.metroDone && status.metroCells === 2);
    const missionSponsor=SPONSOR_SLOTS.find(s=>s.city===city&&s.mission===status.level);
    const missionLogo=localSponsorLogo(missionSponsor?.logo??null);
    const segs = Math.ceil(status.energy / 20);
    return <div className={`play-root ${status.dashing || status.overcharge ? 'is-fast' : ''}`} dir={isRtl(lang)?'rtl':'ltr'}>
    <div ref={host} className="play-stage" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={cancelTouch} onClick={() => { if (!started)
        input.current.start = true; }}/>
    <div className="speed-lines" aria-hidden="true"/>
    <div ref={fx} className="fx-layer" aria-hidden="true"/>
    {unsupported ? <div className="play-unsupported"><img src="/blu.webp" alt="BLU"/><p>{t.unsupported}</p><button className="btn3d yellow" onClick={onMenu}>{t.resume}</button></div> : !started ? <div className="title-screen" onClick={() => { input.current.start = true; begin(); }}>
      <div className="title-logo"><span className="logo-blu">BLU</span><span className="logo-city">CITY</span></div>
      <p className="level-title">{cityLabel} · {ui.level} {status.level}</p>
      {!challenge && <div style={{maxWidth:300,padding:'12px 18px',borderRadius:18,background:'rgba(7,21,47,.85)',textAlign:'center',color:'#fff'}}>
        {missionLogo && <img src={missionLogo} alt={missionSponsor?.name} style={{width:220,height:69,objectFit:'contain'}}/>}
        <strong style={{display:'block',marginTop:8}}>{localized(lang,cityLevels[status.level-1].names)}</strong>
        <p style={{fontSize:14,lineHeight:1.5,margin:'8px 0'}}>{missionInstruction(city,status.level,lang)}</p>
        <span style={{color:'#ffe083'}}>+{cityLevels[status.level-1].rewardCoins} Coin</span>
      </div>}
      <button className="btn3d yellow tap-play" onClick={e => { e.stopPropagation(); input.current.start = true; begin(); }}>{t.tap}</button>
      <button className="btn3d blue title-menu" onClick={e => { e.stopPropagation(); onMenu(); }}>{t.city}</button>
    </div> : <>
      <div className="hud-top">
        <div className="hud-left">
          <button className="btn3d round blue hud-pause" onClick={() => setPaused(true)} aria-label={t.pause}><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="1.5" fill="currentColor"/><rect x="14" y="4" width="5" height="16" rx="1.5" fill="currentColor"/></svg></button>
          <div className={`hud-battery ${status.energy < 20 ? 'low' : ''}`} role="progressbar" aria-label="Energy" aria-valuenow={status.energy} aria-valuemin={0} aria-valuemax={100}>{[0, 1, 2, 3, 4].map(i => <i key={i} className={i < segs ? 'on' : ''}/>)}<b /></div>
        </div>
        <div className="hud-right">
          <div className="hud-score" aria-label={t.score}>{status.score.toLocaleString('en-US')}</div>
          <div ref={boltChip} className="hud-bolts" aria-label={ui.coins}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M13 2 4 13h7l-1 9 10-12h-7l1-8Z" fill="#ffd43b" stroke="#0b2a5b" strokeWidth="2" strokeLinejoin="round"/></svg>{status.coins}</div>
        </div>
      </div>
      <button type="button" className={`hud-mission ${missionExpanded || status.levelDone ? 'expanded' : ''}`} aria-expanded={missionExpanded || status.levelDone} aria-label={objective} onClick={()=>setMissionExpanded(v=>!v)}>
        <span className="mission-arrow" style={{ transform: `rotate(${status.direction}rad)` }} aria-hidden="true">▲</span>
        <div><strong>{challenge ? (translateValue(lang, lang === 'he' ? 'מסלול האנרגיה' : translateValue(lang, lang === 'ar' ? 'مسار الطاقة' : 'Energy circuit'))) : localized(lang, cityMissions(city)[status.level - 1].names)}</strong><span className="mission-objective">{challenge ? objective : missionInstruction(city,status.level as LevelId,lang)}</span><small>{challenge ? `${status.bolts}/20 · ${status.runTime}s` : `${got}/${total} · ${status.meters} m`}</small></div>
        {!status.levelDone && !challenge && <div className="pips">{Array.from({ length: total }, (_, i) => <i key={i} className={i < got ? (status.level === 2 ? 'on pink' : 'on') : ''}/>)}</div>}
      </button>
      {(status.sync === "sync-error" || status.sync === "offline" || status.sync === "storage-error") && <div className="play-tutorial" role="alert">{translateValue(lang, lang === "he" ? "שמירת ההתקדמות נכשלה. צא לתפריט ופתח מחדש כדי לנסות לסנכרן" : translateValue(lang, lang === "ar" ? "فشل حفظ التقدم. افتح اللعبة مجددًا لمحاولة المزامنة" : "Progress save failed. Reopen the game to retry sync"))}</div>}
      {status.tutorial && <div className="play-tutorial">{t.start}</div>}
      {status.celebrating && <div className="victory"><div className="rays"/><strong>{extended.done}</strong><span>{localized(lang, cityMissions(city)[status.level - 1].names)}</span></div>}
      {!challenge && status.levelDone && !status.celebrating && <div className="level-complete"><strong>{ui.reward}{cityMissions(city)[status.level - 1].rewardCoins} {ui.coins}</strong><button className="btn3d yellow" onClick={() => { input.current.next = true; }}>{status.level < 6 ? `${extended.next} · ${ui.level} ${status.level + 1}` : city>=CAMPAIGN_CITY_COUNT?localized(lang,{en:'Adventure complete · Back to city map',he:'ההרפתקה הושלמה · חזרה למפה',ar:'المغامرة اكتملت · ارجع للخريطة'}):`${cityName(city+1,lang)} →`}</button></div>}{challenge && status.runDone && <div className="level-complete"><strong>+40 Coin</strong><button className="btn3d yellow" onClick={onMenu}>{t.menu}</button></div>}
      <div className={`play-controls ${gestureMode ? "gesture-controls" : ""}`}>
        <div className="play-stick" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); stick(e); }} onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId))
            stick(e); }} onPointerUp={release} onPointerCancel={release}><span ref={knob}/></div>
        <div className="play-actions">
          {canCharge ? <button className={`btn3d round green act-charge ${status.charge > 0 ? 'charging' : ''}`} style={{ ['--p' as string]: `${Math.round(status.charge * 100)}%` }} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); hold(true)(); }} onPointerUp={hold(false)} onPointerCancel={hold(false)}><span>{t.interact}</span></button>
                : <button className="btn3d round blue act-dash" disabled={status.energy < 12} onPointerDown={() => { input.current.dash = true; }}><span>{t.dash}</span></button>}
          <button className="btn3d round yellow act-jump" onPointerDown={() => { input.current.jump = true; }}><span>{t.jump}</span></button>
        </div>
      </div>
      {paused && <div className="play-pause"><div className="pause-card"><h2>{t.pause}</h2><button className="btn3d blue" onClick={()=>{cancelTouch();const value=!gestureMode;setGestureMode(value);try{localStorage.setItem('blu_gestures',value?'1':'0');}catch{}}}>{gestureMode ? '◉' : '☝'} · {localized(lang,{en:'Touch gestures',he:'שליטה במחוות',ar:'التحكم بالإيماءات'})}</button><p>{localized(lang,{en:'Drag to move · swipe up to jump · swipe down to slide · double tap to dash · hold near a beacon to charge',he:'גרור לתנועה · למעלה לקפיצה · למטה להחלקה · הקש פעמיים לדאש · החזק ליד יעד לטעינה',ar:'اسحب للتحرك · للأعلى للقفز · للأسفل للانزلاق · انقر مرتين للاندفاع · اضغط مطولًا قرب الهدف للشحن'})}</p>{cityLevels.map(level => <p key={level.id}>{ui.level} {level.id} · {localized(lang, level.names)} {status.completed.includes(level.id) ? "✓" : level.id === status.level ? `${got}/${level.required}` : ui.locked}</p>)}<p>{ui.coins}: {status.coins}{walletTesting ? ` · BLU: ${status.blu}` : ""}</p><p>{ui.dash}: {status.dashLevel}/3</p>{walletTesting && <button className="btn3d yellow" disabled={status.coins < COINS_PER_BLU} onClick={() => { input.current.exchange = true; }}>{ui.exchange}</button>}<button className="btn3d blue" disabled={status.coins < 120 && (!walletTesting || status.blu < DASH_COST_BLU) || status.dashLevel >= 3} onClick={() => { input.current.upgrade = true; }}>{ui.dash} · 120 Coin</button><small>{getSyncStatus() === "cloud" ? "Cloud save" : ui.local}</small><button className="btn3d yellow" onClick={() => setPaused(false)}>{t.continue}</button><button className="btn3d blue" onClick={onMenu}>{t.menu}</button></div></div>}
    </>}
  </div>;
}

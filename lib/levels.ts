import { localized, translateValue, type Lang } from './i18n';
export type LevelId = 1 | 2 | 3 | 4 | 5 | 6;
export type CampaignMission = {id:LevelId;key:string;title:string;required:number;rewardCoins:number;next:number|null;names:{en:string;he:string;ar:string};points:number[][];terminal:number[]};
const CAMPAIGN_TITLES = [
 {en:['Charge the grocery shop','Light the neighborhood street','Deliver energy to the bakery','Restore the workshop sign','Escort the repair technician','Power the neighborhood'],he:['טוענים את המכולת','מאירים את רחוב השכונה','משלוח אנרגיה למאפייה','מפעילים את שלט הסדנה','מלווים את טכנאי התיקונים','מחברים את השכונה לחשמל'],ar:['اشحن البقالة','نوّر شارع الحارة','وصّل الطاقة للمخبز','شغّل لافتة الورشة','رافق فنّي الصيانة','شغّل شبكة الحارة']},
 {en:['Open the market gates','Power the sneaker shop','Deliver energy to the cafe','Repair the market signs','Activate the delivery depot','Restore the market grid'],he:['פותחים את שערי השוק','מחברים את חנות הנעליים','משלוח אנרגיה לבית הקפה','מתקנים את שלטי השוק','מפעילים את מחסן המשלוחים','מחזירים חשמל לשוק'],ar:['نوّر مدخل السوق','شغّل دكانة الأحذية','وصّل الطاقة للمقهى','صلّح لافتات السوق','شغّل مستودع التوصيل','رجّع الكهرباء للسوق']},
 {en:['Restart the traffic lights','Light the civic square','Charge the service center','Restart the transit station','Power the communications tower','Light up city hall'],he:['מפעילים את הרמזורים','מאירים את כיכר העירייה','טוענים את מרכז השירות','מפעילים את תחנת התחבורה','מחברים את מגדל התקשורת','מאירים את בניין העירייה'],ar:['شغّل إشارات السير','نوّر ساحة البلدية','اشحن مركز الخدمات','شغّل محطة النقل','شغّل برج الاتصالات','نوّر مبنى البلدية']}
];
const CAMPAIGN_POINTS = [
 [[[-11,0,-8],[12,0,-23],[-4,0,-43]],[[-13,0,-44],[11,0,-49]],[[17,0,-16],[17,0,-25],[17,0,-42]],[[8,3,-18],[8,4,-26],[8,4,-35]],[[14,0,-47],[29,0,-50]],[[-8,0,-73],[12,0,-79],[27,0,-89]]],
 [[[-7,0,-12],[14,0,-28],[-12,0,-39]],[[14,0,-46],[-12,0,-54]],[[17,0,-12],[20,0,-24],[15,0,-38],[28,0,-44]],[[8,3,-18],[8,4,-35]],[[13,0,-43],[27,0,-47],[29,0,-54]],[[-7,0,-72],[5,0,-80],[18,0,-85],[28,0,-91]]],
 [[[13,0,-11],[-13,0,-24],[1,0,-42]],[[-11,0,-41],[13,0,-52]],[[19,0,-19],[28,0,-39]],[[8,3,-18],[8,4,-26],[8,4,-35]],[[16,0,-45],[28,0,-55]],[[-8,0,-78],[15,0,-86],[28,0,-73]]]
];
const CAMPAIGN_TERMINALS = [
 [[0,0,-35],[-9,0,-50],[17,0,-31],[4,3,-41],[24,0,-52],[12,0,-63]],
 [[-4,0,-34],[14,0,-52],[22,0,-31],[4,3,-41],[24,0,-57],[12,0,-67]],
 [[4,0,-34],[-7,0,-53],[20,0,-32],[4,3,-41],[25,0,-59],[12,0,-67]]
];
export const CAMPAIGN_CITY_COUNT=3;
export function campaignCityIndex(level:number){return Math.min(2,Math.max(0,level-1));}
export function cityMissions(level:number):CampaignMission[]{const city=campaignCityIndex(level);return CAMPAIGN_POINTS[city].map((points,i)=>({id:(i+1) as LevelId,key:`city-${city+1}-mission-${i+1}`,title:CAMPAIGN_TITLES[city].en[i],required:points.length,rewardCoins:[100,150,180,220,260,320][i],next:i===5?null:i+2,names:{en:CAMPAIGN_TITLES[city].en[i],he:CAMPAIGN_TITLES[city].he[i],ar:CAMPAIGN_TITLES[city].ar[i]},points,terminal:CAMPAIGN_TERMINALS[city][i]}));}
// Compatibility export: mission IDs remain local to each city, saves retain balances.
export const LEVELS=cityMissions(1);
export const CAMPAIGN_THEMES=[{ground:0x7bd88f,building:0xf0b98b,accent:0xffb84f,roof:0x643956},{ground:0x395e6c,building:0x38a7ba,accent:0xff59ba,roof:0x182f58},{ground:0x47547d,building:0xc4cfe5,accent:0x70e5ff,roof:0x293c66}];
export function missionInstruction(city:number,id:LevelId,lang:Lang){const m=cityMissions(city)[id-1];const templates={en:['Collect {n} energy cells, then charge the destination','Collect {n} signal cores, then charge the destination','Deliver {n} cells one at a time to the marked shop','Climb the roofs, collect {n} cores, then charge the beacon','Collect {n} tools, escort the technician, then charge the destination','Hold Charge at {n} power nodes, then charge the main beacon'],he:['אסוף {n} תאי אנרגיה ואז טען את היעד','אסוף {n} ליבות אות ואז טען את היעד','הבא {n} תאים אחד בכל פעם לחנות המסומנת','עלה לגגות, אסוף {n} ליבות וטען את המשואה','אסוף {n} כלים, לווה את הטכנאי וטען את היעד','החזק טעינה ב־{n} נקודות כוח ואז טען את המשואה הראשית'],ar:['اجمع {n} خلايا طاقة وبعدين اشحن الهدف','اجمع {n} نوى إشارة وبعدين اشحن الهدف','وصّل {n} خلايا واحدة بكل مرة للدكانة المعلّمة','اصعد للسطوح واجمع {n} نوى وبعدين اشحن الهدف','اجمع {n} أدوات ورافق الفنّي وبعدين اشحن الهدف','اضغط مطولًا عند {n} نقاط طاقة وبعدين اشحن النقطة الرئيسية']};return localized(lang,templates)[id-1].replace('{n}',String(m.required));}
export type ItemId = 'shoes' | 'battery' | 'gloves' | 'neon' | 'gold' | 'street';
export const ITEMS = [
    { id: 'shoes', cost: 150, color: '#ff664f', names: { en: 'Volt sneakers', he: 'נעלי Volt', ar: 'حذاء Volt' }, desc: { en: 'Coral sneakers · +15% run speed', he: 'נעליים בגוון אלמוג · 15% יותר מהירות', ar: 'حذاء مرجاني · سرعة أعلى 15%' } },
    { id: 'battery', cost: 220, color: '#c6f5ff', names: { en: 'Power shell', he: 'מעטפת כוח', ar: 'غلاف الطاقة' }, desc: { en: 'Silver armor · 10 seconds of Overcharge', he: 'שריון כסוף · טעינת יתר ל־10 שניות', ar: 'درع فضي · طاقة خارقة لعشر ثوانٍ' } },
    { id: 'gloves', cost: 180, color: '#ffcf45', names: { en: 'Charge gloves', he: 'כפפות טעינה', ar: 'قفازات الشحن' }, desc: { en: 'Gold gloves · charge objectives 30% faster', he: 'כפפות זהב · טעינת יעדים מהירה ב־30%', ar: 'قفازات ذهبية · شحن أسرع 30%' } },
    { id: 'neon', cost: 120, color: '#3fffc8', names: { en: 'Neon BLU', he: 'BLU ניאון', ar: 'BLU نيون' }, desc: { en: 'Mint shell · cosmetic', he: 'מעטפת מנטה · שינוי מראה', ar: 'غلاف نعناعي · مظهر فقط' } },
    { id: 'gold', cost: 350, color: '#ffc84a', names: { en: 'Golden BLU', he: 'BLU זהוב', ar: 'BLU ذهبي' }, desc: { en: 'Golden shell · cosmetic', he: 'מעטפת זהובה · שינוי מראה', ar: 'غلاف ذهبي · مظهر فقط' } },
    { id: 'street', cost: 200, color: '#ca77ff', names: { en: 'Neon boulevard', he: 'שדרת ניאון', ar: 'شارع النيون' }, desc: { en: 'Recolor the street and billboards', he: 'צבע חדש לרחוב ולשלטים', ar: 'لون جديد للشارع واللوحات' } },
] as const;
export type LevelProgress = {
    version: 4;
    cityLevel: number;
    cells: boolean[];
    restored: boolean;
    metro: boolean[];
    metroDone: boolean;
    coins: number;
    blu: number;
    dashLevel: number;
    lastDaily: string | null;
    dailyDay: number;
    claimed: LevelId[];
    objectives: Record<string, boolean[]>;
    completed: LevelId[];
    inventory: ItemId[];
    skin: 'classic' | 'neon' | 'gold';
    runs: number;
    lastRun: number;
    runStarted: number | null;
    runBolts: number;
    runBest: number;
    revision: number;
};
export const SAVE_KEY = 'blu_central_grid_v1';
export function parseLevelProgress(raw: string | null): LevelProgress {
    let d: Record<string, unknown> = {};
    try {
        const v = JSON.parse(raw || '{}');
        if (v && typeof v === 'object' && !Array.isArray(v))
            d = v;
    }
    catch { }
    const flags = (v: unknown, n: number): boolean[] => Array.isArray(v) ? Array.from({ length: n }, (_, i) => v[i] === true) : Array(n).fill(false);
    const integer = (v: unknown, max: number) => Number.isSafeInteger(v) && Number(v) >= 0 ? Math.min(Number(v), max) : 0;
    const ids = (v: unknown): LevelId[] => Array.isArray(v) ? [...new Set(v.filter((n): n is LevelId => Number.isInteger(n) && n >= 1 && n <= 6))] : [];
    const completed = ids(d.completed);
    if (Number(d.version || 0) < 4 && d.restored === true && !completed.includes(1))
        completed.push(1);
    if (d.metroDone === true && completed.includes(1) && !completed.includes(2))
        completed.push(2);
    const ordered: LevelId[] = [];
    for (const l of cityMissions(Math.max(1, Number(d.cityLevel) || 1))) {
        if (!completed.includes(l.id))
            break;
        ordered.push(l.id);
    }
    const o = (d.objectives && typeof d.objectives === 'object' ? d.objectives : {}) as Record<string, unknown>;
    const objectives: Record<string, boolean[]> = {};
    for (const l of cityMissions(Math.max(1, Number(d.cityLevel) || 1)))
        objectives[l.id] = ordered.includes(l.id) ? Array(l.required).fill(true) : flags(l.id === 1 ? d.cells : l.id === 2 ? d.metro : o[l.id], l.required);
    const inventory = Array.isArray(d.inventory) ? ITEMS.filter(i => (d.inventory as unknown[]).includes(i.id)).map(i => i.id) : [];
    return { version: 4, cityLevel: Math.max(1, integer(d.cityLevel, CAMPAIGN_CITY_COUNT)), cells: objectives[1], restored: ordered.length === 6, metro: objectives[2], metroDone: ordered.includes(2), objectives, completed: ordered, claimed: ids(d.claimed), coins: integer(d.coins, 10000000), blu: integer(d.blu, 100000), dashLevel: integer(d.dashLevel, 3), lastDaily: typeof d.lastDaily === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.lastDaily) ? d.lastDaily : null, dailyDay: integer(d.dailyDay, 7), inventory, skin: d.skin === 'gold' && inventory.includes('gold') ? 'gold' : d.skin === 'neon' && inventory.includes('neon') ? 'neon' : 'classic', runs: integer(d.runs, 100000), lastRun: integer(d.lastRun, 9999999999999), runStarted: typeof d.runStarted === 'number' ? d.runStarted : null, runBolts: integer(d.runBolts, 20), runBest: integer(d.runBest, 9999), revision: integer(d.revision, 99999999) };
}
export function unlockedLevel(p: LevelProgress): LevelId { return Math.min(6, p.completed.length + 1) as LevelId; }
export function completeLevel(p: LevelProgress, id: LevelId): LevelProgress {
    if (p.completed.includes(id) || p.claimed.includes(id) || id !== unlockedLevel(p) || !p.objectives[id]?.every(Boolean))
        return p;
    return parseLevelProgress(JSON.stringify({ ...p, completed: [...p.completed, id], restored: id === 6 || p.restored, metroDone: id === 2 || p.metroDone, coins: p.coins + cityMissions(p.cityLevel)[id - 1].rewardCoins, claimed: [...p.claimed, id] }));
}
export const COINS_PER_BLU = 100, DASH_COST_BLU = 2, DASH_COST_COINS = 120;
export function exchangeCoins(p: LevelProgress): LevelProgress { return p.coins >= 100 ? { ...p, coins: p.coins - 100, blu: p.blu + 1 } : p; }
export function upgradeDash(p: LevelProgress): LevelProgress { return p.dashLevel >= 3 ? p : p.coins >= DASH_COST_COINS ? { ...p, coins: p.coins - DASH_COST_COINS, dashLevel: p.dashLevel + 1 } : p.blu >= 2 ? { ...p, blu: p.blu - 2, dashLevel: p.dashLevel + 1 } : p; }
export const DAILY_COINS = [20, 30, 40, 50, 60, 80, 100] as const;
export function dailyState(p: LevelProgress, now = Date.now()) { const today = new Date(now).toISOString().slice(0, 10), yesterday = new Date(now - 86400000).toISOString().slice(0, 10), claimed = p.lastDaily === today; const day = claimed ? Math.max(1, p.dailyDay) : p.lastDaily === yesterday ? p.dailyDay % 7 + 1 : 1; return { today, day, claimed, reward: DAILY_COINS[day - 1] }; }
export function claimDailyReward(p: LevelProgress, now = Date.now()): LevelProgress { const d = dailyState(p, now); return d.claimed ? p : { ...p, coins: p.coins + d.reward, lastDaily: d.today, dailyDay: d.day }; }
export type MissionPosition = {
    x: number;
    y: number;
    z: number;
};
export type GameCommand = {
    position?: MissionPosition;
    type: 'mission-start' | 'mission-pickup' | 'mission-charge' | 'mission-escort' | 'daily' | 'exchange' | 'dash' | 'buy' | 'equip' | 'collect' | 'finish' | 'run-start' | 'run-finish' | 'next-city';
    cityLevel?: number;
    id?: number | string;
    index?: number;
    bolts?: number;
};
export function applyCommand(p: LevelProgress, c: GameCommand, now = Date.now()): LevelProgress {
    if (c.cityLevel !== undefined && c.cityLevel !== p.cityLevel)
        return p;
    switch (c.type) {
        case 'mission-start':
        case 'mission-pickup':
        case 'mission-charge':
        case 'mission-escort': return { ...p };
        case 'next-city': return p.completed.length === 6 && p.cityLevel < CAMPAIGN_CITY_COUNT ? parseLevelProgress(JSON.stringify({ ...p, cityLevel: p.cityLevel + 1, completed: [], claimed: [], objectives: {}, cells: [], metro: [], restored: false, metroDone: false, runStarted: null })) : p;
        case 'daily': return claimDailyReward(p, now);
        case 'exchange': return exchangeCoins(p);
        case 'dash': return upgradeDash(p);
        case 'buy': {
            const item = ITEMS.find(i => i.id === c.id);
            return item && !p.inventory.includes(item.id) && p.coins >= item.cost ? { ...p, coins: p.coins - item.cost, inventory: [...p.inventory, item.id], skin: item.id === 'neon' || item.id === 'gold' ? item.id : p.skin } : p;
        }
        case 'equip': return c.id === 'classic' || (c.id === 'neon' || c.id === 'gold') && p.inventory.includes(c.id) ? { ...p, skin: c.id as LevelProgress['skin'] } : p;
        case 'collect': {
            const id = Number(c.id) as LevelId, index = c.index;
            if (id !== unlockedLevel(p) || p.completed.includes(id) || !Number.isInteger(index) || index! < 0 || index! >= cityMissions(p.cityLevel)[id - 1].required)
                return p;
            const a = [...p.objectives[id]];
            if (a[index!])
                return p;
            a[index!] = true;
            return parseLevelProgress(JSON.stringify({ ...p, objectives: { ...p.objectives, [id]: a }, ...(id === 1 ? { cells: a } : id === 2 ? { metro: a } : {}) }));
        }
        case 'finish': return completeLevel(p, Number(c.id) as LevelId);
        case 'run-start': return p.completed.length >= 2 && (!p.runStarted || now - p.runStarted > 300000) && now - p.lastRun >= 60000 ? { ...p, runStarted: now } : p;
        case 'run-finish': {
            const elapsed = now - (p.runStarted || now);
            return p.runStarted && elapsed >= 20000 && elapsed <= 300000 && Number.isInteger(c.bolts) && c.bolts! >= 20 ? { ...p, coins: p.coins + 40, runs: p.runs + 1, lastRun: now, runStarted: null, runBest: p.runBest ? Math.min(p.runBest, Math.round(elapsed / 1000)) : Math.round(elapsed / 1000) } : p;
        }
        default: return p;
    }
}
// City levels retain purchased equipment and balances; each starts six fresh missions.
export function cityScale(level: number) { return 1 + Math.min(8, Math.max(0, level - 1)) * .15; }
export function cityName(level:number,lang:Lang){return localized(lang,{en:['BLU Neighborhood','Energy Market','City Center'],he:['שכונת BLU','שוק האנרגיה','מרכז העיר'],ar:['حارة BLU','سوق الطاقة','قلب المدينة']})[campaignCityIndex(level)];}
export type { Lang } from './i18n';

// Reserved storefront lots: outside the sidewalk (outer edge x=20.3), 18 m spacing.
export function businessPlot(id:number){return {x:26,z:8-(id-1)*18,width:9,depth:4};}
export function overlapsBusinessPlot(x:number,z:number,width:number,depth:number){return [1,2,3,4,5,6].some(id=>{const p=businessPlot(id);return Math.abs(x-p.x)<(width+p.width)/2+1 && Math.abs(z-(p.z-2.1))<(depth+p.depth)/2+1;});}

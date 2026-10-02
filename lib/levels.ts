import { localized, translateValue, type Lang } from './i18n';
export type LevelId = 1 | 2 | 3 | 4 | 5 | 6;
export const LEVELS = [
    { id: 1, key: 'light-up-the-city', title: 'LIGHT UP THE CITY', required: 3, rewardCoins: 100, next: 2, names: { en: 'Light up the city', he: 'מאירים את העיר', ar: 'نوّر المدينة' } },
    { id: 2, key: 'metro-rush', title: 'METRO RUSH', required: 2, rewardCoins: 150, next: 3, names: { en: 'Metro Rush', he: 'מרוץ המטרו', ar: 'سباق المترو' } },
    { id: 3, key: 'energy-delivery', title: 'ENERGY DELIVERY', required: 3, rewardCoins: 180, next: 4, names: { en: 'Energy delivery', he: 'משלוח אנרגיה', ar: 'توصيل الطاقة' } },
    { id: 4, key: 'rooftop-chase', title: 'ROOFTOP CHASE', required: 3, rewardCoins: 220, next: 5, names: { en: 'Rooftop chase', he: 'מרדף על הגגות', ar: 'مطاردة فوق السطوح' } },
    { id: 5, key: 'robot-rescue', title: 'ROBOT RESCUE', required: 2, rewardCoins: 260, next: 6, names: { en: 'Rescue the mechanic', he: 'מצילים את המכונאי', ar: 'أنقذ الميكانيكي' } },
    { id: 6, key: 'power-district', title: 'POWER DISTRICT', required: 3, rewardCoins: 320, next: null, names: { en: 'Restore the power district', he: 'מפעילים את רובע הכוח', ar: 'شغّل حي الطاقة' } },
] as const;
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
    for (const l of LEVELS) {
        if (!completed.includes(l.id))
            break;
        ordered.push(l.id);
    }
    const o = (d.objectives && typeof d.objectives === 'object' ? d.objectives : {}) as Record<string, unknown>;
    const objectives: Record<string, boolean[]> = {};
    for (const l of LEVELS)
        objectives[l.id] = ordered.includes(l.id) ? Array(l.required).fill(true) : flags(l.id === 1 ? d.cells : l.id === 2 ? d.metro : o[l.id], l.required);
    const inventory = Array.isArray(d.inventory) ? ITEMS.filter(i => (d.inventory as unknown[]).includes(i.id)).map(i => i.id) : [];
    return { version: 4, cityLevel: Math.max(1, integer(d.cityLevel, 100)), cells: objectives[1], restored: ordered.length === 6, metro: objectives[2], metroDone: ordered.includes(2), objectives, completed: ordered, claimed: ids(d.claimed), coins: integer(d.coins, 10000000), blu: integer(d.blu, 100000), dashLevel: integer(d.dashLevel, 3), lastDaily: typeof d.lastDaily === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.lastDaily) ? d.lastDaily : null, dailyDay: integer(d.dailyDay, 7), inventory, skin: d.skin === 'gold' && inventory.includes('gold') ? 'gold' : d.skin === 'neon' && inventory.includes('neon') ? 'neon' : 'classic', runs: integer(d.runs, 100000), lastRun: integer(d.lastRun, 9999999999999), runStarted: typeof d.runStarted === 'number' ? d.runStarted : null, runBolts: integer(d.runBolts, 20), runBest: integer(d.runBest, 9999), revision: integer(d.revision, 99999999) };
}
export function unlockedLevel(p: LevelProgress): LevelId { return Math.min(6, p.completed.length + 1) as LevelId; }
export function completeLevel(p: LevelProgress, id: LevelId): LevelProgress {
    if (p.claimed.includes(id) || id !== unlockedLevel(p) || !p.objectives[id]?.every(Boolean))
        return p;
    return parseLevelProgress(JSON.stringify({ ...p, completed: [...p.completed, id], restored: id === 6 || p.restored, metroDone: id === 2 || p.metroDone, coins: p.coins + LEVELS[id - 1].rewardCoins, claimed: [...p.claimed, id] }));
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
        case 'next-city': return p.completed.length === 6 && p.cityLevel < 100 ? parseLevelProgress(JSON.stringify({ ...p, cityLevel: p.cityLevel + 1, completed: [], claimed: [], objectives: {}, cells: [], metro: [], restored: false, metroDone: false, runStarted: null })) : p;
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
            if (id !== unlockedLevel(p) || p.completed.includes(id) || !Number.isInteger(index) || index! < 0 || index! >= LEVELS[id - 1].required)
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
export function cityName(level: number, lang: Lang) { const names = { en: ['Central Grid', 'Neon Heights', 'Power Metropolis'], he: ['הרובע המרכזי', 'גבעות הניאון', 'מטרופולין האנרגיה'], ar: ['الشبكة المركزية', 'مرتفعات النيون', 'مدينة الطاقة الكبرى'] }; return localized(lang, names)[Math.min(2, level - 1)] + (level > 3 ? ' ' + level : ''); }
export type { Lang } from './i18n';

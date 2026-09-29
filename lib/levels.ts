/** Central Grid is one continuous map. Levels are missions within that map. */
export const LEVELS = [
  { id: 1, key: 'light-up-the-city', title: 'LIGHT UP THE CITY', required: 3, rewardCoins: 100, next: 2 },
  { id: 2, key: 'metro-rush', title: 'METRO RUSH', required: 2, rewardCoins: 150, next: null },
] as const;

export type LevelId = 1 | 2;
export type LevelProgress = {
  version: 2;
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
};

export const SAVE_KEY = 'blu_central_grid_v1';

export function parseLevelProgress(raw: string | null): LevelProgress {
  let data: Record<string, unknown> = {};
  try { const parsed: unknown = raw ? JSON.parse(raw) : {}; if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed as Record<string, unknown>; } catch { /* start with an empty checkpoint */ }
  const flags = (value: unknown, count: number) => Array.isArray(value) && value.length === count ? value.map(v => v === true) : Array(count).fill(false) as boolean[];
  const restored = data.restored === true, metroDone = restored && data.metroDone === true;
  const claimed = Array.isArray(data.claimed) ? data.claimed.filter((v): v is LevelId => v === 1 || v === 2) : [];
  return {
    version: 2,
    cells: restored ? [true, true, true] : flags(data.cells, 3),
    restored,
    metro: metroDone ? [true, true] : flags(data.metro, 2),
    metroDone,
    coins: Number.isSafeInteger(data.coins) && Number(data.coins) >= 0 ? Math.min(Number(data.coins), 1_000_000) : 0,
    blu: Number.isSafeInteger(data.blu) && Number(data.blu) >= 0 ? Math.min(Number(data.blu), 100_000) : 0,
    dashLevel: Number.isSafeInteger(data.dashLevel) && Number(data.dashLevel) >= 0 ? Math.min(Number(data.dashLevel), 3) : 0,
    lastDaily: typeof data.lastDaily === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.lastDaily) ? data.lastDaily : null,
    dailyDay: Number.isSafeInteger(data.dailyDay) && Number(data.dailyDay) >= 0 ? Math.min(Number(data.dailyDay), 7) : 0,
    claimed: [...new Set(claimed)],
  };
}

export function completeLevel(progress: LevelProgress, id: LevelId): LevelProgress {
  if ((id === 1 && !progress.restored) || (id === 2 && !progress.metroDone) || progress.claimed.includes(id)) return progress;
  return { ...progress, coins: progress.coins + LEVELS[id - 1].rewardCoins, claimed: [...progress.claimed, id] };
}

export function unlockedLevel(progress: LevelProgress): LevelId { return progress.restored ? 2 : 1; }

export const COINS_PER_BLU = 100;
export const DASH_COST_BLU = 2;
export function exchangeCoins(progress: LevelProgress): LevelProgress {
  return progress.coins >= COINS_PER_BLU ? { ...progress, coins: progress.coins - COINS_PER_BLU, blu: progress.blu + 1 } : progress;
}
export function upgradeDash(progress: LevelProgress): LevelProgress {
  return progress.blu >= DASH_COST_BLU && progress.dashLevel < 3 ? { ...progress, blu: progress.blu - DASH_COST_BLU, dashLevel: progress.dashLevel + 1 } : progress;
}

export const DAILY_COINS = [20, 30, 40, 50, 60, 80, 100] as const;
export function dailyState(progress: LevelProgress, now = Date.now()) {
  const today = new Date(now).toISOString().slice(0, 10);
  const yesterday = new Date(now - 86400000).toISOString().slice(0, 10);
  const claimed = progress.lastDaily === today;
  const day = claimed ? Math.max(1, progress.dailyDay) : progress.lastDaily === yesterday ? progress.dailyDay % 7 + 1 : 1;
  return { today, day, claimed, reward: DAILY_COINS[day - 1] };
}
export function claimDailyReward(progress: LevelProgress, now = Date.now()): LevelProgress {
  const daily = dailyState(progress, now);
  return daily.claimed ? progress : { ...progress, coins: progress.coins + daily.reward, lastDaily: daily.today, dailyDay: daily.day };
}

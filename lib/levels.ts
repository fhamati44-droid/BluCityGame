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
    claimed: [...new Set(claimed)],
  };
}

export function completeLevel(progress: LevelProgress, id: LevelId): LevelProgress {
  if ((id === 1 && !progress.restored) || (id === 2 && !progress.metroDone) || progress.claimed.includes(id)) return progress;
  return { ...progress, coins: progress.coins + LEVELS[id - 1].rewardCoins, claimed: [...progress.claimed, id] };
}

export function unlockedLevel(progress: LevelProgress): LevelId { return progress.restored ? 2 : 1; }

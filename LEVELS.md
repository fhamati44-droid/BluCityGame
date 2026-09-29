# BLU CITY progression (Central Grid slice)

The playable district contains two ordered mission levels. `lib/levels.ts` is the level manifest and the single place for reward amounts. Level 1, **Light Up the City**, requires three energy cells and charging the generator. Its completion lights the district and awards 100 local game coins once. Level 2, **Metro Rush**, unlocks after Level 1, requires two signal cores and charging the station, and awards 150 local game coins once. Completing Level 1 shows a Continue button before activating Level 2 objectives. The pause overlay displays both levels and their status.

The checkpoint `blu_central_grid_v1` migrates older saves and stores objectives, completion flags, claimed reward IDs, coins, BLU balance, and dash upgrade level. Old completed missions are recorded as claimed without retroactive coin awards. In the pause menu, 100 Coin can be exchanged for 1 internal BLU, and 2 BLU buys one dash upgrade (up to three). Each upgrade extends dash by 0.1 seconds. Both balances have **no cash value**. The game currently saves on the current device only; this storage is editable by the player. Do not use local completion or the client balance as a basis for paid purchases or external transfers.

Before enabling paid upgrades or a persistent cross-device economy, build a server-authoritative ledger keyed to verified Telegram identity, idempotent mission claims, fraud controls and payment processing. The existing `blu_players.level` field is an upgrade tier; it is separate from these playable mission level IDs. Keep the existing Supabase mission/upgrade endpoints separate until a migration has been reviewed and applied.

Additional districts can use the same structure: stable level ID, unlock prerequisite, objectives, world consequence, one-time reward, and checkpoint. Add a new mission only after its playable scene and completion criteria exist.

## Game hub

The opening screen is now a mobile game hub with Home, Missions, BLU upgrades, Friends, and Profile. It reads the same checkpoint as the 3D city; returning from the city reloads the saved mission and balance state. The city renderer is loaded only when entering gameplay. The hub offers the same Coin-to-BLU exchange and dash upgrade as the pause overlay.

Daily rewards are local-only: 20/30/40/50/60/80/100 Coin across seven consecutive UTC calendar days. One claim is allowed per date; missing a day restarts at Day 1 and finishing Day 7 wraps to Day 1. Checkpoint parsing preserves `lastDaily` and `dailyDay` when the game saves. Client clocks and local storage can be edited; these rewards are not appropriate for real-money purchases.

Achievements derive from actual local mission completion and dash upgrade state. Leaderboards, multiplayer races, skins, and paid purchases are explicitly planned features, not live systems. Supabase schema and API behavior are unchanged by this UI update.

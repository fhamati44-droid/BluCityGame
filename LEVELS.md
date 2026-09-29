# BLU CITY progression (Central Grid slice)

The playable district contains two ordered mission levels. `lib/levels.ts` is the level manifest and the single place for reward amounts. Level 1, **Light Up the City**, requires three energy cells and charging the generator. Its completion lights the district and awards 100 local game coins once. Level 2, **Metro Rush**, unlocks after Level 1, requires two signal cores and charging the station, and awards 150 local game coins once. Completing Level 1 shows a Continue button before activating Level 2 objectives. The pause overlay displays both levels and their status.

The checkpoint `blu_central_grid_v1` migrates older saves and stores objectives, completion flags, claimed reward IDs, and coins. Old completed missions are recorded as claimed without retroactive coin awards. The game currently saves on the current device only; this storage is editable by the player. These coins have **no cash value** and cannot be exchanged for a BLU token. Do not use local completion or the client balance as a basis for on-chain transfers.

Before enabling paid upgrades or conversion, build a server-authoritative ledger keyed to verified Telegram identity, idempotent mission claims, fraud controls, payment processing and a clearly specified BLU economy. The existing `blu_players.level` field is an upgrade tier; it is separate from these playable mission level IDs. Keep the existing Supabase mission/upgrade endpoints separate until a migration has been reviewed and applied.

Additional districts can use the same structure: stable level ID, unlock prerequisite, objectives, world consequence, one-time reward, and checkpoint. Add a new mission only after its playable scene and completion criteria exist.

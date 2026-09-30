# BLU CITY · Chapter 1

## Player loop
Explore → play a mission → collect energy → restore infrastructure → earn Coin → equip BLU → unlock the next mission. No cash yield, withdrawable balance or passive mining.

The playable chapter uses one expanded, connected map, not six separate full cities:
1. Three cells, main generator, street/window restoration: 100 Coin.
2. Two signal cores, station restoration, train starts: 150 Coin.
3. Delivery route through east alley, shop lights up: 180 Coin.
4. Bounce pad and three rooftop cells, rooftop finish beacon: 220 Coin.
5. Two repair tools, escort the mechanic to the workshop: 260 Coin.
6. Three power nodes, district gate opens: 320 Coin.

After level 2, an Energy Circuit gives 40 Coin for collecting 20 bolts and charging the finish beacon. Minimum 20 seconds, maximum 5 minutes, one minute between paid completions. Runs can be repeated; chapter rewards can only be claimed once. Daily seven-day rewards remain available.

## Economy and equipment
`lib/levels.ts` defines the versioned save, mission manifest, item catalog and reducer shared by server/client. Purchases cannot deduct arbitrary client-supplied amounts. Coin→BLU costs 100:1. Dash upgrades cost 120 Coin each, or use 2 existing BLU when Coin is insufficient, maximum three upgrades.

Volt sneakers (150 Coin): coral shoes, +15% ground run speed.
Power shell (220): silver shell, 10-second Overcharge instead of seven.
Charge gloves (180): golden gloves, objective charging 30% faster.
Neon (120) / Gold (350): cosmetic shell colors, selectable alongside Classic.
Neon boulevard (200): recolors east street and city billboards.
Equipment is visible on the actual animated 3D rig in the city and wardrobe preview. These are material variants, not imported high-detail clothing models. Future silhouettes/clothing and unique mission content remain a content expansion. City levels now grow in footprint and retain purchased equipment.

## Unified save
`lib/progress-store.ts` is the only client source of progression for Hub and City. Guest mode is local. Telegram identity is verified by server HMAC; account mode uses `/api/progress` and Supabase `blu_players.city_save` plus `city_revision`.

Commands are queued in a persistent local outbox with stable UUIDs. An atomic private database command ledger stores command receipts; reopening retries unfinished requests without applying a confirmed purchase twice. Revision compare-and-swap prevents lost concurrent spending; conflict refreshes and reapplies the command against the server balance. Sync errors lock further spending and remain visible. Cloud loading supersedes local wallet values. Legacy local mission objectives may migrate on the first Telegram open; client wallet values are never copied into the server. The old sparks balance remains in its legacy column; it is not silently converted into new Coin. A new cloud wallet starts at zero and earns canonical mission rewards. Legacy completed mission migration credits canonical mission rewards once, so the migrated total can differ from a previously spent local wallet.

This is not a fully authoritative multiplayer simulation: objective contact is detected by the client. Server enforces mission prerequisites, one-time awards, catalog prices, daily dates and run duration/cooldown, but does not verify movement trajectories. Do not market this as an anti-cheat-certified economy.

A profile action produces a ten-minute single-use link for connecting a browser to the same account. Consuming it sets a 30-day HttpOnly signed cookie. Treat the link as a temporary login credential; do not share it with others. Anonymous URL visits remain separate guest saves. Legacy station APIs and RLS are preserved, but that reserve is not part of the new game wallet UI.

## Required deployment step
Run `supabase/progression_v3.sql` in Supabase SQL Editor. It adds two player columns, private browser-link/payment-order tables and service-role-only functions. It does not drop old data or open public RLS policies. If the old `(20000)` error remains, run `supabase/fix_open_action.sql` first.

Without this migration the chapter and equipment remain playable locally, and the interface explicitly says cloud setup is required. Cross-device sync is NOT active until SQL is applied. This environment has no authorized Supabase SQL connector; the migration has not been applied remotely.

## Optional Telegram Stars purchases
Off by default. Proposed catalog: 500 Coin / 50 Stars; 1,200 / 100; 3,000 / 200. Review these prices before enabling. All equipment and missions can be earned through play.

To activate after the SQL migration:
1. Set server-only `TELEGRAM_WEBHOOK_SECRET` to a generated secret supported by Telegram's secret_token format, `BLU_SUPPORT_USERNAME` to your support username, and `BLU_PAYMENTS_ENABLED=true` in Vercel; redeploy.
2. Register the bot webhook at `https://blu-city-game.vercel.app/api/telegram/webhook` with that `secret_token` and allowed updates `message,pre_checkout_query`. Check the existing webhook first; replacing another bot backend may affect its commands.
3. Test a Stars purchase/refund in a controlled Telegram account before advertising paid packs.

`/api/payments/invoice` creates stored, user-bound orders and XTR invoices. Webhook authenticates the Telegram secret, validates order/price/currency/user at precheckout, and credits ONLY `successful_payment`. A SQL row lock plus unique payment charge makes retries idempotent; wallet and order settle in one transaction. A client invoice callback never awards Coin. `/terms` and `/paysupport` explain the purchase/support path. Refunds are operator-managed through Telegram refundStarPayment; automated refund/reversal handling is not implemented. Purchases must remain off until operator support/refunds and end-to-end testing are ready.

## Verification
`npm run typecheck`, `node tests/progression.cjs`, `node tests/scene.cjs`.
The CPU scene test runs the real scene update loop with actual Three geometry and a mock GPU, completing all six missions. It checks checkpoint/reward flow, roof collection and escort transitions. It injects positions for most missions, but traverses the rooftop route and terminal using actual movement input. It also checks real character material colors. It does not certify game feel, mobile FPS or GPU rendering. Real-device Telegram testing is still required. Do not claim database/payments tested before applying SQL and configuring webhook.


## City-level progression
Version 4 saves separate `cityLevel` from the six mission IDs. Version 3 completion/balance/equipment data migrates automatically. Completing mission 6 marks the city restored; `next-city` clears only city objectives, completion/reward receipts and an unfinished run. Purchased gear, balances, daily streak and dash upgrades persist. Commands include their city level to prevent delayed objective commands from an earlier city applying to a new one. The new footprint scales by 15% per city up to 2.2 times; mission types currently repeat, and unique districts/story quests are future content work. The rooftop route includes walkable ramps and bridges as an alternative to bounce-pad parkour.

# BLU Testnet journey verification — 2026-10-02

## Evidence and scope

| Boundary | Result | Evidence |
|---|---|---|
| New browser account | Passed | Live site starts at 0 Coin / 0 BLU, city 1, mission 1. Missions 2–6 are locked and have distinct instructions. |
| Missions 1–6 | Passed in CPU scene integration | `tests/scene.cjs` executes the actual Three scene loop with a mocked renderer, including deliveries, rooftops, escort and charged power nodes. |
| Cloud checkpoints and balances | Passed against isolated PostgreSQL | `tests/journey.cjs` runs actual progress and withdrawal API handlers against the real SQL migrations in PGlite. Reopening after each mission preserves completion. |
| Equipment, dash and conversion | Passed | Purchases persist, skin is equipped, dash increases, 100 Coin converts to 1 BLU. Scene tests check character material colors. |
| Withdrawal reservation | Passed | Two BLU are reserved once. Repeating the request does not debit twice. A stale progress revision cannot overwrite the reservation. |
| City 2 | Passed | Six completed missions unlock city 2. Missions reset while balances, skin, equipment and dash remain. A new mission checkpoint survives reopening. |
| Account separation | Passed | A second account retains its own empty progress and cannot read the first account's withdrawal requests. |
| Testnet chain payout | Observed in production | User supplied two confirmed requests (1 BLU and 2 BLU), both with transaction hashes. Recipient balance API returned 2 BLU for the second recipient. User subsequently reported confirmed status in the game. |
| Live GPU gameplay | Not verified in this environment | Cloud browser reports `GL_VENDOR = Disabled, GL_RENDERER = Disabled`; the game correctly renders its unsupported-device fallback. This is not evidence of a player-device failure. |
| Telegram close/reopen and wallet restoration | Requires device check | No signed-in Telegram mobile session is available in the test browser. |

The integration test simulates the worker's persisted confirmed result; it does not broadcast a transaction or claim to test the live chain. `tests/ton.cjs` separately verifies the payout worker's transaction-proof checks and durable retries. No production balances or secrets are used by the tests.

## Remaining mobile acceptance check

Use the existing Testnet account in Telegram; do not clear its data or disconnect the wallet.

1. Open BLU and record city, active mission, Coin, internal BLU and connected wallet address.
2. Complete the remaining missions and enter the next city. Confirm that its mission 1 opens and equipment stays equipped.
3. Close the Mini App completely and open it again through the bot. Confirm the same account, city, balances and equipment.
4. Open BLU, switch to Home, return to BLU and confirm the wallet restores without a white page. Check the already confirmed withdrawal; no additional withdrawal is necessary for this acceptance check.

These checks complete the mobile story. Passing this Testnet story alone does not establish Mainnet readiness; wallet ownership proof, server-side gameplay validation and token economics remain separate work.

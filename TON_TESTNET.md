# BLU TON testnet integration

BLU master: `kQCBHdQIyXcjejVkFbxjnRYTdxksqTyJNs2vnTybXuTyT5DW` (9 decimals).

The BLU tab connects wallets using TON Connect on chain `-3` and reads the balance from the master-derived jetton wallet. The server verifies its owner and master, rather than looking up tokens by name. Game BLU and on-chain BLU are separate balances.

## Deployment

1. Deploy this branch through the existing Next.js hosting pipeline.
2. Set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS game origin. Confirm `/tonconnect-manifest.json` and `/ton-icon.png` are publicly accessible without deployment protection. For preview tests, leave the origin unset or use that preview's origin.
3. Optionally set server-only `TONCENTER_TESTNET_API_KEY` to avoid public RPC rate limits.
4. Apply `supabase/ton_testnet.sql` after the existing schema and progression_v3 migration.
5. Keep `BLU_TESTNET_WITHDRAWALS_ENABLED=false` until someone is assigned to process payouts. Set it to `true` and redeploy to accept requests. Wallet connection and balance reading work without this flag or SQL migration.

## Test flow

Open through Telegram with a cloud-synced profile; connect the testnet wallet holding your tokens. The panel should read 999,990 BLU if that balance has not changed. A wallet that never received BLU shows 0, while RPC errors show unavailable (never a misleading zero).

Earn Coin and use the existing 100 Coin → 1 internal BLU exchange. Confirm a test destination, request 1 BLU, and check the cloud balance decreases by 1. A request is pending, not a completed transfer. Requests are limited to 10 BLU per player per UTC day, including requests later refunded. Idempotency keys prevent repeated requests from charging twice. Existing progress commands share the player row lock and revision check, so a concurrent stale save cannot restore spent BLU.

The connection selects a destination; it does not create a verified wallet-owner login. Telegram authentication authorizes the request. The explicit checkbox confirms where to send tokens. Linking an external wallet as a login identity would additionally require server-side TON Proof verification.

## Manual payouts

There is no automatic signer in this change and no seed phrase belongs in GitHub or the client. Inspect pending rows using the server/admin database access. Atomically mark one pending row processing before sending; only continue when the update returned that row:

```sql
update public.blu_testnet_withdrawals set status='processing'
where id='<request UUID>' and status='pending' returning *;
```

Using the funded TESTNET treasury wallet, transfer exactly the row's amount of BLU to its destination. Decode the raw address with a TON wallet/tool if it requires a friendly address. Include the request UUID as the transaction comment. Verify the successful jetton transfer, matching master, destination, and amount in the testnet explorer. Only then set `status='confirmed'` and `tx_hash` to the matching transfer hash. Never mark a wallet's submission confirmation as chain confirmation.

If a send is interrupted, reconcile the treasury history before retrying. Leave ambiguous rows processing to avoid double payment. Do not automatically refund or retry them.

For a definitively unsent request, refund and change status in ONE database transaction, locking the player before the request (the same lock order as reservations), restoring `city_save.blu` and incrementing `city_revision`. Do not merely change status to refunded: that does not restore the balance.

## Limits

Testnet only, no market price, no Mainnet rollout. Automatic testnet payouts require the separate setup below. Existing mission collection is client reported and older checkpoints can be imported. Those rewards are not sufficiently validated for monetary payouts. Mainnet requires authoritative gameplay/anti-abuse checks, approved token economics, verified wallet ownership if used for account identity, and an audited payout worker with persistent reconciliation. Do not enable Mainnet by changing one address or chain string.

## References

- https://docs.ton.org/applications/ton-connect/get-started
- https://docs.ton.org/payments/jettons
- https://github.com/ton-blockchain/ton-connect/blob/main/spec/connect.md


## Automatic payouts (testnet only)

Apply `supabase/ton_payouts.sql` after `ton_testnet.sql`. Use a new dedicated V4 testnet treasury, not the player's daily wallet. Put its mnemonic and matching raw address into private server variables `BLU_TESTNET_TREASURY_MNEMONIC` and `BLU_TESTNET_TREASURY_ADDRESS`. Fund it with testnet BLU and enough testnet TON for fees. Do not use this treasury for other transfers while the worker operates.

Configure `CRON_SECRET` and an authenticated scheduler every 60 seconds to call `GET /api/ton/payouts`. Set `BLU_TESTNET_PAYOUTS_ENABLED=true` only after the database migration, funding and scheduler are ready. Reservation activation is independently controlled by `BLU_TESTNET_WITHDRAWALS_ENABLED`.

The worker serializes the treasury queue, durably saves a single signed external message before broadcasting, and resends only that same message on retries. A reservation is confirmed only after a successful recipient Jetton wallet transaction with the expected master, sender, query ID and amount emits the matching notification. A broadcast acknowledgement or treasury seqno change alone does not confirm a payout. Destination history inspection is bounded to 100 transactions; older unconfirmed transfers require operator review.

If a signed message expires without a verified credit, the oldest request blocks the queue with `review-required`; the worker does not automatically re-sign or refund an ambiguous transaction. Reconcile against chain history before changing its status. Never replace the configured treasury while a request is processing. Keep server RPC credentials and mnemonic out of logs and client variables.

Full live test remains required: connect wallet, earn/convert internal BLU, reserve 1 BLU, observe the worker dispatch, verify the recipient balance and chain transaction, and verify repeated scheduler calls do not pay twice. The automated unit/SQL tests cannot substitute for this chain test.

Mainnet remains disabled. The game currently accepts client-reported objective collection, so authoritative gameplay validation and reward limits must be implemented before funding withdrawals with real assets. Mainnet also requires a separately deployed/audited BLU master, a dedicated treasury, tested fee funding and operator recovery procedures.

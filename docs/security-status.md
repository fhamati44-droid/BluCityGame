# Security status — Testnet, 2026-10-02

## Hardened and tested

- Progress POST requests require the application's exact Origin, including browser-link consumption and creation.
- Commands are validated against an explicit schema before database access. Unknown commands, extra balance fields, invalid mission/objective/item IDs, malformed UUIDs and invalid revisions are rejected without changing the save.
- Telegram authentication rejects duplicate query fields, non-integer timestamps, expired data and timestamps more than 30 seconds in the future; signature verification remains mandatory.
- Cron secret comparison uses byte lengths, so invalid multibyte input produces an unauthorized response instead of a timingSafeEqual exception.
- Existing tests verify atomic withdrawal reservations, stable retries, revision conflicts, per-account visibility, daily limits and verified recipient credit before payout confirmation.
- New withdrawals require TON Connect `ton_proof`. `/api/ton/proof` issues a random 10-minute challenge in a signed HttpOnly cookie, bound to the authenticated player, domain and Testnet. The verifier extracts the key from address-matching StateInit with known V3R2, V4R2 or V5R1 code and verifies the Ed25519 signature.
- A successful proof creates a signed HttpOnly verification cookie valid for 24 hours, bound to the same user/domain/network/address. It clears the browser challenge. A cookie-free or mismatched-address request cannot reserve tokens. Supported code extraction is deliberately limited; unsupported wallet code fails closed rather than trusting the supplied public key.
- Existing connections continue to display balance and withdrawal history. To make a new withdrawal they must reconnect through the ownership-verification button and approve the proof in their wallet. No recovery phrase or transaction fee is requested by this proof.
- Tests use generated local keys and cover valid proofs, altered signatures, mismatched keys, addresses, users, domains and networks, expired challenges, and browser challenge clearing. Live mobile wallet approval still needs acceptance testing.
- The user subsequently supplied a Telegram mobile screenshot showing wallet ownership verified. New-request approval and restoration across the 24-hour cookie lifetime remain acceptance checks.
- Progress commands now share durable per-player limits: 8 writes per second, 60 per minute and at least 2 seconds between commands that credit Coin. The server derives whether a command credits Coin from the authoritative save; the client cannot choose that flag or overwrite the private `_serverRate` metadata.
- Limiter metadata is stored in `city_save` through the existing revision-locked RPC and is omitted from public progress responses. Concurrent replicas cannot independently reset it. Withdrawal/payment updates preserve the metadata because they update individual JSON fields.
- A throttled progress request returns HTTP 429 with a bounded wait duration and performs no write. The client's persistent outbox retains its command ID and retries after the wait, preserving idempotency. The SQL integration tests exercise two independent handlers, account isolation, burst and minute expiry, blocked reward completion, and unchanged state on rejection.

## Still required before Mainnet

1. **Gameplay proof:** the server currently accepts valid collect commands without proving movement or objective interaction. An authenticated user can automate valid commands at the allowed rate. Schema validation and rate limits are not a complete anti-cheat solution. A server-authoritative mission session and bounded telemetry/checkpoint validation must be designed and tested.
2. **Wallet proof operations:** test approval and restoration in the actual Telegram mobile wallets. The challenge is browser-bound and stateless; durable global one-use nonce tracking and explicit revocation must be added before Mainnet. Unknown wallet code is not yet supported.
3. **Operational controls:** durable rate limits, payout monitoring and alerts, explicit review/recovery for ambiguous or expired transfers, and treasury secret management.
4. **Economic limits:** approve emissions, conversion rules, daily budgets and funding before issuing tokens of monetary value.

These changes strengthen the existing Testnet service. They do not establish Mainnet readiness. No new environment variables or SQL migration are required for this hardening pass.

Protocol source: https://github.com/ton-blockchain/ton-connect/blob/main/spec/connect.md#address-proof-signature-ton_proof

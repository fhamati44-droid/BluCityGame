# Security status — Testnet, 2026-10-02

## Hardened and tested

- Progress POST requests require the application's exact Origin, including browser-link consumption and creation.
- Commands are validated against an explicit schema before database access. Unknown commands, extra balance fields, invalid mission/objective/item IDs, malformed UUIDs and invalid revisions are rejected without changing the save.
- Telegram authentication rejects duplicate query fields, non-integer timestamps, expired data and timestamps more than 30 seconds in the future; signature verification remains mandatory.
- Cron secret comparison uses byte lengths, so invalid multibyte input produces an unauthorized response instead of a timingSafeEqual exception.
- Existing tests verify atomic withdrawal reservations, stable retries, revision conflicts, per-account visibility, daily limits and verified recipient credit before payout confirmation.

## Still required before Mainnet

1. **Gameplay proof:** the server currently accepts valid collect commands without proving movement or objective interaction. An authenticated user can automate valid commands. Schema validation is not an anti-cheat solution. A server-authoritative mission session and bounded telemetry/checkpoint validation must be designed and tested.
2. **Wallet ownership:** a connected address is not cryptographic proof of ownership. Verify TON Connect ton_proof using a server challenge bound to the authenticated player, domain, network and expiration before enabling valuable withdrawals.
3. **Operational controls:** durable rate limits, payout monitoring and alerts, explicit review/recovery for ambiguous or expired transfers, and treasury secret management.
4. **Economic limits:** approve emissions, conversion rules, daily budgets and funding before issuing tokens of monetary value.

These changes strengthen the existing Testnet service. They do not establish Mainnet readiness. No new environment variables or SQL migration are required for this hardening pass.

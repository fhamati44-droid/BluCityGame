# BLU — City of Energy

A trilingual (English, Hebrew, Arabic) Telegram Mini App with a mobile game hub and an explorable third-person Three.js city. Complete two Central Grid missions, restore the city, earn Coin, convert 100 Coin to 1 internal BLU and upgrade dash. A seven-day daily reward and achievements use the local game checkpoint. There is no external token, cash balance, deposit, or withdrawal.

## Local preview

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Outside Telegram, the app runs in clearly labeled browser demo mode and stores progress in localStorage. It does not impersonate a Telegram user.

## Supabase

1. Create a project and run `supabase/schema.sql` in SQL Editor.
2. Set `SUPABASE_URL` to `https://jyhvsckuyvriezzqhrel.supabase.co` and set `SUPABASE_SERVICE_ROLE_KEY` privately in Vercel. Never expose this key as a `NEXT_PUBLIC_` variable.
3. The players table has RLS enabled and no client policy. Only the authenticated server route calls the `blu_game_action` RPC. It preserves the existing station reserve, upgrade tier and referral systems. Playable mission checkpoints, Coin, internal BLU, dash upgrades and daily rewards currently live in localStorage, independently of this legacy server profile. They are not yet synced across devices or authoritative for paid purchases.
4. For an earlier deployment whose `open` action returns SQLSTATE `20000`, run `supabase/fix_open_action.sql` in the SQL Editor. It preserves the deployed function's other behavior and grants.

## Telegram

1. Create a bot in `@BotFather` with `/newbot`; keep its token private.
2. Configure its Main Mini App URL with `/mybots` → Bot Settings → Configure Mini App → Enable Mini App. The URL must be your HTTPS Vercel deployment.
3. Set `TELEGRAM_BOT_TOKEN` in Vercel. The game is configured for `@BluCityGame_bot` referral links; `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` can override that username.
4. Open the bot in Telegram and use the Launch App button. The server verifies Telegram's signed `initData`, including a one-hour freshness limit. A normal browser can only use demo mode.

## GitHub + Vercel

Push this folder as a GitHub repository. Import it in Vercel as a Next.js project. Set `TELEGRAM_BOT_TOKEN`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`. The bot username already defaults to `BluCityGame_bot`. Deploy, then configure the HTTPS deployment URL in BotFather. Do not commit `.env.local` or any bot token.

If the Vercel project is connected to GitHub but shows “No Production Deployment”, push a commit to the `main` branch to start the first production build. Verify its status under Deployments before setting the URL in BotFather.

## Product limits

Central Grid currently has two playable missions. The Energy Tower chapter, skins, multiplayer and leaderboards are marked as planned. There are no payments, external token, push reminders, or admin console. Mission completion callbacks still preserve the original server profile behavior; playable stage IDs are separate from server upgrade tiers. Full commercial use of BLU as the game's name needs trademark clearance in launch countries.

# BLU — City of Energy

A trilingual (English, Hebrew, Arabic) Telegram Mini App game. Players complete hourly missions, recharge every three hours, upgrade BLU, unlock city districts, and earn referral rewards after a friend's third mission. Sparks are game points only; there is no token, cash balance, deposit, or withdrawal.

## Local preview

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Outside Telegram, the app runs in clearly labeled browser demo mode and stores progress in localStorage. It does not impersonate a Telegram user.

## Supabase

1. Create a project and run `supabase/schema.sql` in SQL Editor.
2. Copy `.env.example` to `.env.local`. Fill in the Supabase project URL and **service role key**. Never expose this key as a `NEXT_PUBLIC_` variable.
3. The players table has RLS enabled and no client policy. Only the authenticated server route calls the `blu_game_action` RPC. All economy changes are performed atomically in PostgreSQL.

## Telegram

1. Create a bot in `@BotFather` with `/newbot`; keep its token private.
2. Configure its Main Mini App URL with `/mybots` → Bot Settings → Configure Mini App → Enable Mini App. The URL must be your HTTPS Vercel deployment.
3. Set `TELEGRAM_BOT_TOKEN` in Vercel. The game is configured for `@BluCityGame_bot` referral links; `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` can override that username.
4. Open the bot in Telegram and use the Launch App button. The server verifies Telegram's signed `initData`, including a one-hour freshness limit. A normal browser can only use demo mode.

## GitHub + Vercel

Push this folder as a GitHub repository. Import it in Vercel as a Next.js project. Set `TELEGRAM_BOT_TOKEN`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` from `.env.example`. The bot username already defaults to `BluCityGame_bot`. Deploy, then configure the HTTPS deployment URL in BotFather. Do not commit `.env.local` or any bot token.

## Product limits

The game has one playable mission type and six rendered district tiles; the database supports twenty districts. It has no payments, real token, leaderboard, push reminders, or admin console yet. Referral points are awarded after three completed missions, but stronger fraud controls are needed before any economic rewards. Full commercial use of BLU as the game's name needs trademark clearance in launch countries.

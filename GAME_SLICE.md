# BLU CITY — Central Grid vertical slice

## Repository review (2026-09-29)

| Area | Before this slice | Current status |
|---|---|---|
| Architecture | Next.js App Router client page, API route, Supabase RPC | Retained. Full viewport game loads as a separate client component; old menus remain behind pause/menu. |
| Rendering | Three.js procedural isometric city, SVG fallback | Three.js third-person playable scene added. Hardware WebGL is required for gameplay. |
| Telegram | WebApp SDK, initData HMAC verification in the API, invite links | Retained. The game opens after identity/data load. |
| Supabase | `blu_players`, RLS enabled without public policy, `blu_game_action` service-role RPC | Untouched. Completion attempts the existing mission reward action, which can be rejected by its 1-hour cooldown. |
| Movement | None; camera orbited a static map | Keyboard and touch joystick, sprint, double jump, dash, slide, elevated rail with launch pad. Camera follows BLU. |
| Screens | Home, tasks, city, friends, profile dashboard | Gameplay first. The earlier screens remain as menus. |
| Assets | `public/blu.webp` / `blu.png` illustration | Existing art remains in menus; in-world BLU is procedural geometry. A rigged model/animation is still needed. |
| Persistence | Supabase for old counters; browser localStorage for demo | Cell pickups and restoration have a local checkpoint. No synced mission checkpoint table yet. |
| Performance | Hundreds of independent city meshes and dynamic lighting | One zone, capped 1.5 DPR, no shadows, limited lights; profiling on target Android Telegram WebView remains necessary. |

## Playable slice

Spawn in Central Grid. Move toward three visible energy cells. Jump or double jump; use dash with energy, or the launch pad to reach the elevated rail. Hold Charge at the generator after collecting three cells. The street windows and lamps light up, the metro starts moving, and Energy Tower remains visible beyond the zone. Drones and traffic provide ambient movement. The local checkpoint survives reopening in the same browser storage.

Touch: drag the left stick to move, Jump and Dash on the right, swipe up/down for jump/slide, hold Charge near the generator. Keyboard: WASD/arrows, Space, left Shift for dash, Ctrl for slide.

## Honest quality gate

This is a playable technical slice, not a finished action game. The in-world character is procedural and has no animation rig. There are no collision volumes for traffic, enemies, NPC dialogue, meaningful rooftop parkour, combat, sound mix, or cinematic sequence. Rail movement is a first pass. The game does not yet save checkpoints to Supabase; local WebView storage may be cleared. The existing mission reward has a cooldown, so completion does not guarantee a server reward. Production acceptance requires device playtesting, control tuning, collision and animation polish, synced progress, and a dedicated mission completion RPC. Old mission entry points now open the playable scene rather than granting a reward on click.

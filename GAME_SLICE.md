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

Spawn in Central Grid. Move through connected streets toward three visible energy cells. Jump or double jump; use dash with energy, or the launch pad to reach the elevated rail. Hold Charge at the generator after collecting three cells. The street windows and lamps light up in sequence, and the metro starts moving. The next objective begins in the same scene: collect two metro signal cores and charge the station. Energy Tower remains visible beyond the zone. Drones and traffic provide ambient movement. The local checkpoint survives reopening in the same browser storage.

Touch: drag the left stick to move, Jump and Dash on the right, swipe up/down for jump/slide, hold Charge near the generator. Keyboard: WASD/arrows, Space, left Shift for dash, Ctrl for slide.

## Honest quality gate

This is a playable technical slice, not a finished action game. The in-world character uses the original BLU illustration as a camera-facing sprite with movement and celebration motion; a rigged 3D model and authored animations are still needed. There are no collision volumes for traffic, enemies, NPC dialogue, meaningful rooftop parkour, combat, sound mix, or cinematic sequence. Rail movement is a first pass. The game does not yet save checkpoints to Supabase; local WebView storage may be cleared. The first mission reward still has a cooldown, and the second local mission has no server reward. Production acceptance requires device playtesting, control tuning, collision and animation polish, synced progress, and a dedicated mission completion RPC. Old mission entry points now open the playable scene rather than granting a reward on click.

## Visual & character pass (2026-09-29)

- **BLU is now a real 3D character** (`app/components/BluRig.ts`), built procedurally to match the approved artwork: battery body with rim bands and cap, cartoon face (eyes with irises and highlights, eyebrows, open smile with teeth and tongue), gloved arms, navy legs and lightning-bolt sneakers. Toon shading plus ink outlines (inverted hull).
- **Animation states, blended every frame:** idle breathing, random blinking and glancing, run cycle with arm swing and body bob, jump stretch, **front flip on double jump**, landing squash, slide (lean back), dash (superman pose), charging (arms forward, shaking, determined face), celebration (hops, thumbs-up and fist pump, happy squint) and a wave on the title screen. When the player stops for a moment BLU turns to face the camera.
- The charge meter on BLU's chest and the bolt on his back reflect current energy (red when low).
- **Scene:** golden-hour sky dome, sun and clouds, saturated toon buildings with instanced windows that light up one by one when power is restored, neon signs, trees, colourful traffic, collectible gold bolts (instanced) in runner-style lines including over the launch pad and along the rail.
- **Juice:** particle bursts, floating text, camera shake on hard landings and restore, FOV kick and speed lines on dash/overcharge, haptics.
- **UI:** title screen (tap to play), chunky 3D buttons, outlined type (Rubik, covers EN/HE/AR), score and bolt counter, battery-shaped energy meter, mission ribbon with direction arrow and progress pips, radial-fill Charge button, victory banner with rays, restyled pause card. Menus use the same visual language.
- Score and bolts are per-session display only; they do not touch the server economy.

Still open: authored (artist-made) animations would look better than procedural ones; profile on low-end Android WebView; bolts are not saved.

# BLU campaign and sponsor placements

The campaign contains three cities, each with six sequential mission IDs. `cityMissions(cityLevel)` in `lib/levels.ts` defines names, checkpoints, terminals, objective counts and Coin rewards. Both the scene and server mission guard consume these definitions. The six existing mechanics remain collection/charging, signal collection, individual deliveries, rooftop collection, technician escort and node activation; authored routes and counts vary across cities.

- BLU Neighborhood: grocery, street, bakery, workshop, technician, neighborhood grid.
- Energy Market: gates, sneaker shop, cafe, market signs, delivery depot, market grid.
- City Center: traffic lights, civic square, service center, transit station, communications tower, city hall.

City themes change building height/color, market stalls, civic architecture and landmarks. Business signs brighten on mission completion. The final city ends the campaign; exploration and the existing energy circuit remain available without resetting story rewards. City map cards show progress and locks; they are not a teleport interface or a replay editor.

## Sponsor setup

Edit `lib/sponsors.ts`. Each slot has a city, local mission ID, display name, color and optional local logo path. Add the logo to `public/sponsors/` and use `/sponsors/name.png`, `.webp` or `.svg`. Only local paths with simple file names are accepted. Deploy after changing configuration. Missing logos retain the text sign. There is no sponsor management dashboard or external advertising tracking.

The included Spark Bakery and Volt Sneakers SVGs are fictional examples. They do not imply a commercial partnership. Slot colors specify brand accents; city architecture still uses its district theme.

## Save compatibility

Save schema and cloud database remain unchanged. City numbers above three map to the final authored city. Coins, BLU, purchases and completed mission flags are preserved. Completed missions are expanded to the current city's objective count; unfinished flags retain their indices. Existing saves therefore resume on the same local mission in the authored campaign rather than starting over. Prior repeated cities are not individually archived.

## Validation

CPU scene tests complete all 18 missions and verify city transitions and rewards. Server tests exercise all 18 receipt sequences, varying counts, timing checks, repeat rejection and the final-city cap. These are not GPU/mobile visual tests or authoritative physics. Real-device performance and sponsor presentation should be reviewed before a paid sponsor agreement.

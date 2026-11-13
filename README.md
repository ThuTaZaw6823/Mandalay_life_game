# Mandalay Life v5.0 — Royal City Major Update

A playable **alpha source project** for browser (Three.js + Vite) and a PC/Mac Electron window. This is a stylized, fictionalized Mandalay game environment based on the reference images supplied by the user. It is **not an exact geographic or historically faithful reconstruction** of the real Royal Palace or Zay Cho Market. This version builds on v4.3 and preserves 12 GLB models and the existing save key.

## Starting the game

Requires Node.js 20.19+ or 22.12+ and npm with access to the npm package registry (first install):

```bash
npm install
npm run dev
```

Open the local Vite URL, generally `http://127.0.0.1:5173/`.

To open a standalone **desktop window** using the same game code:

```bash
npm run desktop
```

`npm run desktop` creates an Electron window, not a signed installer. `npm run build` emits the browser version into `dist/`.

## What's new in v5

### Expanded map and full Royal Palace zone
- The map expands from **1,380 × 1,380** world units to **2,040 × 2,040** units (~2.19 times the area).
- Major palace zone in the northern district, featuring square perimeter moat, distinctive walled gates, red-gold halls and pagoda-inspired watchtowers.
- **Exactly four moat bridges**, one at each side center, connect the external roads to a courtyard cross-road. Water collision prevents walking/driving across other sections of moat.
- **Enterable palace interiors:** central audience hall, royal museum/gallery, archive, historical halls, gate posts and multiple pavilions. Stand by their doors and press `E`.
- Interior palace hall exhibits reuse the v4.3 room-navigation code; palace buildings are **stylized prototypes**, not fully unique hand-modeled historical interiors.

### Zay Cho Plaza
- Rebuilt market zone with multi-storey facade, red-gold roofline, clock tower, front stalls, and a ground-floor entry (`E`).
- The interior includes simplified food, clothing, tea and general-goods stalls; shop interactions and purchases aren't implemented yet.

### Helicopter pads
- One circular **H-marked helipad** inside palace courtyard and **four more** atop dedicated office towers.
- Helicopter can climb above roofs, approach a pad, descend using `Shift`, stop at deck altitude, and use `E` to dismount there.
- After dismounting on a rooftop, `E` near the helicopter re-boards; `R` uses a prototype rooftop exit that returns to street level. These are **scripted arcade landing mechanics**, not realistic aviation physics.
- Other plane types cannot use rooftop helipads.

### Living city + vehicle dynamics
- Added wooden park benches, playing children, families and strolling couples in several parks (procedural NPC animations).
- Added ambient police patrol cars mixed into the traffic. No wanted system, pursuit logic or sirens yet.
- Increased walking speed from 7 to 7.9 and sprinting from 12.5 to 14.1 world units/sec (about +13%).
- Animated player car, bus, motorbike, bicycle and airplane GLB wheel pivots. Front wheels use separate steering and spinning pivots; the two car/bus front wheels steer together on A/D input.
- Animated wheels on background traffic and police patrols.
- Roadside lamp/tree placements are rejected if they overlap drivable road centerlines.

### Preserved from v4.3
- Cars, buses, bicycles, motorbikes, planes, helicopter and three moored riverboats.
- Delivery and coin systems, property purchase/construction/planting and auto-save.
- Enterable city buildings with mixed apartment/office levels, bedrooms and E/Q stair interactions.
- Day/night (20 real seconds = 1 game hour), 24h clock, sun/moon/stars, rain, thunderstorm, snow, dynamic traffic and animal behavior.
- The wide **western river stays unbridged**, separate from the Palace's moat.

## Controls

| Key | Action |
|---|---|
| W / S | Forward / reverse |
| A / D | Turn left / right |
| Shift | Sprint on foot / descend with aircraft |
| Space | Jump on foot / ascend with aircraft |
| E | Enter/exit vehicle, palace hall, market or building; go upstairs by indoor stairs |
| Q | Descend indoor stairs |
| R | Return to street from rooftop helipad (prototype stairwell shortcut) |
| F | Collect/deliver parcel |
| B / H / T | Buy land / build house / plant tree |
| V | Cycle weather |
| C | Change character |
| Mouse drag / scroll | Orbit / zoom camera |
| Esc | Help / pause |

## Testing

```bash
npm test
npm run build
```

A test suite (pure logic + model-file/source validation) is included. **The authoring environment lacked cached npm dependencies and npm network access**, so a true Vite production build, Electron launch, and full 3D/browser playtest could not be performed here. A user's machine must be used for final runtime and visual verification.

### Suggested first manual playtest
1. Drive north to the Palace (large blue square moat on minimap). Check all four bridges and vehicle entry.
2. Enter the audience hall, museum and guard posts with `E`; leave again.
3. Visit Zay Cho Plaza and enter the ground-floor market.
4. Board the airport helicopter, fly to one of the four rooftop `H` pads, descend with `Shift`, press `E` to get out, then `R` to return to street.
5. Drive a car, turn on A/D and look at both front wheels. Watch police cars driving past.
6. Walk through a park and observe the benches, families, children and couples.
7. Verify old coins/properties, delivery missions, 24h time, weather and boats still work.

## Project layout

- `src/v5layout.js`: Pure map, moat, bridges and helipad spatial definitions
- `src/world.js`: Larger terrain, Royal Palace, Zay Cho, interior templates, pads, parks
- `src/vehicles.js`: Wheel steering, GLB vehicle motion, helicopter platform altitudes
- `src/main.js`: Player movement, camera, rooftop interactions, minimap
- `src/citylife.js`: Police cars, AI vehicle wheels and pedestrian traffic
- `src/physics.js`: Bounds, collisions, swept movement
- `src/character.js`, `src/weather.js`, `src/timecycle.js`: Preserved previous systems
- `public/models/*.glb`: Existing v4.1 original art models, not photographic recreations
- `tests/*.test.js`: Validation tests for map, geometry rules and previous systems

### Known limitations

The game remains a lightweight alpha. Palace and plaza are modular geometry inspired by the images, not exact reproductions. Rooftop landing is simplified: there is no real helicopter lift/rotorcraft simulation, no collision-based aircraft damage, and rooftop exits use a shortcut rather than a constructed stairwell. Traffic AI follows preset routes, park NPCs use looping motion, and interior stair travel remains interaction-based. Actual 3D visual/performance QA must be done after installing dependencies.

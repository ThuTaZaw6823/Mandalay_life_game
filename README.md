# Mandalay Life V10.6

3D open-world city, driving, boating, and aviation game built with **Three.js**, **Vite**, and **Electron**.

## Features

- **2,640-unit Royal City Map (`WORLD_LIMIT = 1320`):** Mandalay Royal Palace with continuous moat and 4 gate bridges, Zay Cho Plaza & clock tower, Kuthodaw-inspired Pagoda, Royal Teak Monastery, Mahamuni Quarter, Mandalay Hill, Irrawaddy riverside promenade, and outer farmland.
- **Expanded Airport & 10 Flyable GLB Aircraft:** 760-unit runway with 5 fixed-wing bays (`A1`–`A5`) and 5 helicopter/eVTOL pads (`H1`–`H5`) under `public/aircraft-v10/models/`, complete with retractable landing gear (50 units / 0.50 game km), rolling touchdown physics, and rooftop helipads.
- **City Traffic, River Boats & Wildlife:** 10 procedural V9 traffic vehicle types you can board directly, timed traffic lights, pedestrians, 3 river vessels, dogs, cats, and birds.
- **Dynamic Environment:** 24-hour day/night cycle with streetlights and moonlit skies, automatic/manual weather (`clear`, `rain`, `storm`, `snow`) with thunder audio, enterable multi-floor buildings, and buyable land plot with buildable villa and garden.
- **Interactive City Map & 3D Showroom:** Full-screen explorer atlas (`M`) with landmark waypoints, plus `showroom.html` to inspect procedural vehicles, boats, villas, and avatars.

## Commands

```bash
npm install
npm run dev       # Start local Vite dev server (http://127.0.0.1:5173)
npm run build     # Build production bundle into dist/
npm test          # Run unit tests (node --test tests/*.test.js)
npm run check     # Run tests and production build
npm run desktop   # Build and launch Electron desktop app
```

## Controls

| Key / Input | Action |
| :--- | :--- |
| `W A S D` / Arrow keys | Walk, drive, steer aircraft or boat |
| `Shift` | Sprint on foot / vehicle boost / descend in aircraft |
| `Space` | Jump on foot / climb in aircraft (planes lift off at `>= 50 mph`) |
| `E` | Enter/exit vehicle or building, go upstairs |
| `Q` | Go downstairs inside multi-floor buildings |
| `R` | Exit rooftop helipad back to street level |
| `F` | Pick up / complete parcel delivery mission |
| `J` | Jump to Mandalay International Airfield |
| `M` | Open / close the Royal City Map |
| `B` / `H` / `T` | Buy land plot / build house / plant tree |
| `C` / `V` | Switch avatar outfit / cycle weather mode |
| `P` | Rescue player to nearest clear street |
| `Esc` | Pause / toggle controls & help overlay |
| Mouse drag / Scroll | Orbit camera / zoom |

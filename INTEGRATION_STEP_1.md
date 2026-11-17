# Mandalay Life — Original Repository + OSM 3D Integration (Phase 1)

This is an **additive** integration step for the original `Mandalay_life_game-main` folder, while on branch `feature/v8-open-world`.

## What this patch does

- Keeps original `index.html`, `src/main.js`, `src/world.js`, `src/vehicles.js`, and `src/mandalay-map.js` exactly as they were.
- Adds the latest OSM 3D preview under `osm-preview.html` and `src/osm-v8/` (v8.1 + road/sidewalk v8.2 Step 3A).
- Adds your original local OSM source file (`source/map.osm`), its converted `public/data/mandalay.json`, and an optional Blender sample kiosk `.glb`.
- Adds independent OSM tests under `tests/osm-v8/`.
- Changes **only one existing file**: `vite.config.js`, adding an extra build input to include `osm-preview.html` on GitHub Pages.
- Does **NOT** yet migrate old vehicle positions, missions or world collisions into the OSM world. Two preview routes are intentionally separate for validation. This is **not** the final merged game.

## Install in your ORIGINAL Git repository folder (Mac / VS Code Terminal)

```bash
# Confirm you are in Mandalay_life_game-main, branch feature/v8-open-world
pwd
git branch --show-current
git status -sb

# Extract patch into SAME folder; use your actual ZIP download location
unzip -o ~/Downloads/Mandalay_Life_Original_Repo_OSM_Integration_Phase1.zip -d .

npm test
node --test tests/osm-v8/*.test.mjs
npm run build
npm run dev
```

Open the addresses shown by Vite (port may vary):

- `http://127.0.0.1:5173/` — original game remains unchanged.
- `http://127.0.0.1:5173/osm-preview.html` — OSM 3D world preview, Blender sample, driving prototype.

Vite may choose another port, such as 5174/5175; use the one reported by the terminal.

## Changes and rollback

Before committing, inspect changes:

```bash
git status --short
git diff -- vite.config.js
```

If both routes work, commit safely to the **feature** branch (do not merge into main yet):

```bash
git add vite.config.js osm-preview.html src/osm-v8 public/data/mandalay.json public/data/model-placements.json public/models/mandalay-kiosk.glb source/map.osm scripts/import_osm.py blender tests/osm-v8 INTEGRATION_STEP_1.md
git commit -m "Add OSM 3D world preview alongside original game"
```

For rollback **before committing**, in the repo root:

```bash
git restore vite.config.js
rm -rf osm-preview.html src/osm-v8 tests/osm-v8 source/map.osm scripts/import_osm.py blender public/data/mandalay.json public/data/model-placements.json public/models/mandalay-kiosk.glb INTEGRATION_STEP_1.md
```

Only run the rollback if these new paths came from this patch and you have not added personal work there.

## Important

- The road layout and footprints come from your uploaded `map.osm`; building heights and details are artistic approximations.
- GitHub Pages deploys `main`; your working `feature/v8-open-world` branch will not change the public site until you merge it.
- This phase tests co-location and safe build integration. Phase 2 will adapt original vehicles, character, save data, and missions to OSM coordinates and remove duplicate world implementations gradually.
- Do not overwrite `src/world.js` or paste the v8 `src/main.js` over the original: this would break original gameplay.
- OSM © OpenStreetMap contributors; ODbL attribution is included in the preview.

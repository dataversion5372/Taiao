---
name: verify
description: Build/launch/drive recipe for verifying Taiao (this repo's browser RPG) headlessly
---

# Verifying Taiao changes

Static browser game, no build step. Serve the repo and drive it in headless
Firefox (no Chrome on this machine) with puppeteer-core over WebDriver BiDi.

## Launch

```bash
python3 -m http.server 8901 -d ~/RPG &   # serve (file:// taints WebGL textures)
# puppeteer-core lives in $CLAUDE_JOB_DIR/tmp or any scratch dir: npm i puppeteer-core
```

```js
const browser = await require("puppeteer-core").launch({
  browser: "firefox",
  executablePath: "/Applications/Firefox.app/Contents/MacOS/firefox",
  headless: true, protocol: "webDriverBiDi",
});
```

Boot detection: `waitForFunction(() => typeof world !== "undefined" && !!world && player.px !== undefined)`,
then sleep ~4s for chunk meshes. `player`, `world`, `camZoom`, `camStep` are
top-level script globals — reachable from `page.evaluate`.

## Teleport (the main driving primitive)

```js
await page.evaluate((tx, ty) => {
  player.x = tx; player.y = ty; player.level = 0;
  player.px = tx * 48; player.py = ty * 48;   // PX(t) = t*TILE*SCALE = t*48
  player.path = []; player.moving = null; player.goal = null; player.sailing = null;
  camZoom = 1.6;
}, x, y);
await new Promise(r => setTimeout(r, 5000));  // chunk meshes rebuild
await page.screenshot({ path: "shot.png" });
```

## Gotchas

- Fresh puppeteer profile each launch → always a new save at world.playerStart
  (a city plaza; same seed every run, so found targets are reproducible).
- Scan for terrain features in-page via `world.isWater / world.heightAt /
  world.LAND_ELEVATION / world.getGround / world.getChunk` — but every touched
  chunk runs hydraulic erosion (~0.1-1s each). Keep scans within ~12 chunk
  rings of the player or the frame loop stalls for minutes.
- Do NOT teleport 1000+ tiles in one hop: 25 chunks generate synchronously in
  one frame and the screenshot can hang past 5 min. The coastline is 2000+
  tiles from spawn — effectively unreachable for a quick visual check.
- Kill orphaned Firefox with `pgrep -fl firefox` after a timed-out run.
- After a chunk-DB version bump every teleport regenerates chunks from scratch
  — a 5s post-teleport wait can screenshot half-built terrain (looks flat /
  missing rivers). Use 8-10s, or re-shoot before concluding a render bug.
- Gameplay probes can call `passable(x,y)` / `moveTo(x,y)` directly in
  evaluate; sleep ~400ms per step so the frame loop advances player.moving.
- Displayed altitude tier: `round(max(0,(heightAt-LAND_ELEVATION)/(1-LAND_ELEVATION))*50)`
  half-blocks (matches render3d.js rawStep).
- Neutralize monsters or they kill the test player mid-run (whales at sea!):
  `for (const m of monsters) { m.alive = false; m.respawnAt = 9e15; }` — and
  repeat on an ~800ms interval, since newly activated chunks spawn more.
- Perf triage exports: `world._genLog` (chunk data-gen ms), `R3D._meshLog`
  (mesh build ms), `R3D._diag()` (incl. gyPerf/wlPerf section timers),
  `R3D._structDetail()` (per-structure visibility state). Frame gaps: record
  deltas in a rAF loop while holding `keys.d = true`.
- Pure-math scans (no chunk gen): `world.heightAt`, `world.riverFlowAt`,
  `world.walledVillagesNear` — use these to find distant features before
  paying for teleports; `world.isWater/getGround/getDecor` all force chunk
  generation.

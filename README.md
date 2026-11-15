# Emberlight Keep

A tower-defence game for [make.fun](https://make.fun)'s **best-game-01** bounty
("Make the best game", $1,000). Built as an entry for that competition.

The last ember burns at the end of the road, and the Gloam is coming. Build
towers on the stone plots — Spark Spires, Frost Lanterns, Ember Cannons and
Prism Obelisks — upgrade them between waves, and stop every creature for ten
waves. If the ember's twenty hearts burn out, the light dies.

## How to play

Serve `game/` with any static server (`node serve.ts`, then open
http://localhost:8080) and play in a desktop browser. No network requests,
no build step, all art and sound made in code.

- **Click a stone plot** to build, or press **1–4** with a plot selected
- **Space** calls the next wave early (bonus gold)
- **P** pauses, **F** toggles 1×/2× speed, **M** mutes, **R** restarts
- Click a tower to upgrade it or sell it back

## Files

- `game/src/config.js` — tuning, tower and enemy definitions
- `game/src/level.js` — the path, build plots and the ten waves
- `game/src/enemies.js` — the Gloam: movement, chilling, damage
- `game/src/towers.js` — aiming, firing, projectiles and upgrades
- `game/src/game.js` — screens, economy, waves, win and loss
- `game/src/render.js` — all canvas drawing and the clickable UI
- `game/src/audio.js` — synthesised WebAudio sound, no audio files
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=…&seed=…`)
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json` with `vendor/makefun-game.ts`

MIT licensed. An original game: its own idea, art, sounds and names.

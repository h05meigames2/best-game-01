# Emberlight Keep

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/h05meigames2/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/h05meigames2/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A 2D tower-defence game for the make.fun **best-game-01** bounty — built from
scratch in this session, after the competition opened.

## The game

The last ember of the keep burns at the end of a winding road. Waves of the
Gloam — Emberlings, Skitters, Husks, Wisps, and, on wave 10, Gloomlords —
march down the road to snuff it out. You have 20 hearts of ember, a purse of
gold, and twelve old stone plots to build on.

- **Four towers**: Spark Spire (fast bolts), Frost Lantern (slows the Gloam),
  Ember Cannon (splash shells), Prism Obelisk (chain lightning).
- **Build** by clicking a stone plot (or keys 1–4), **upgrade** towers to
  level 3, **sell** them back for 70% of what you spent.
- **Call waves early** with Space for a gold bonus; **P** pauses, **F**
  toggles 1×/2× speed, **M** mutes, **R** restarts.
- **Win** by surviving all 10 waves; **lose** if the ember's 20 hearts run out.

Everything is original and made in code: the art is canvas drawing, the
sound is synthesised WebAudio, and there are no external assets or network
requests. The game is fully deterministic — the same seed always plays the
same battle — and an honest autopilot (no cheats, only the same gold and
towers a player gets) wins all 10 waves.

## Play

Serve the folder and open it in a desktop browser:

```sh
node serve.ts
# open http://localhost:8080
```

Deterministic screenshot scenes are available as
`?shot=start|play|victory|defeat&seed=1`.

## Files

- `game/index.html` — the page
- `game/src/config.js` — constants and tower definitions
- `game/src/level.js` — the road, the ember, the build plots
- `game/src/enemies.js` — the five Gloam kinds and the fixed wave tables
- `game/src/towers.js` — targeting, firing, projectiles
- `game/src/game.js` — the state machine (waves, economy, win/lose)
- `game/src/render.js` — all canvas art
- `game/src/audio.js` — synthesised sound
- `game/src/shots.js` — deterministic screenshot scenes
- `game/src/input.js` — mouse + keyboard
- `game/src/main.js` — entry point and main loop
- `game/src/random.js` — seeded random (cosmetic only)
- `main.ts` — hands the game in (copies `game/` + `screenshots/`, writes `dossier.json`)
- `serve.ts` — tiny static server for local play

## License

MIT — see `LICENSE`.

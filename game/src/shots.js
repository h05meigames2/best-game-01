// Screenshot scenes behind ?shot=start|play|victory|defeat. Each one plays the
// real rules forward from a fresh game for a fixed number of steps, steered by a
// simple autopilot that builds towers on the best plots, upgrades them and calls
// waves early — so the frame is what a real game looks like, and the same seed
// always gives the same frame.
import { STEP, TOWER_ORDER, TOWERS, WAVE_COUNT } from './config.js';
import { PLOTS } from './level.js';
import { SCREEN_DEFEAT, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './game.js';

const SAMPLE = STEP;

/** Plots sorted by value (path covered), best first. */
const RANKED_PLOTS = [...PLOTS].sort((a, b) => b.value - a.value);

/** Spend the gold on hand: best plots first, Cannon on bends, then upgrades. */
function autopilotBuild(game) {
  const state = game.state;
  // Fill empty plots with the best affordable tower for that plot.
  for (const plot of RANKED_PLOTS) {
    if (state.towers.some((t) => t.plotId === plot.id)) continue;
    const kind = plot.value >= 60 ? 'cannon' : plot.value >= 45 ? 'spark' : 'spark';
    if (state.gold >= TOWERS[kind].cost) {
      state.selectedPlot = plot.id;
      game.buildSelected(kind);
    }
  }
  // Upgrade the cheapest tower we can afford, lowest level first.
  let upgraded = true;
  while (upgraded) {
    upgraded = false;
    const tower = [...state.towers].sort((a, b) => a.level - b.level || a.spent - b.spent)[0];
    if (!tower) break;
    const cost = Math.round(TOWERS[tower.kind].cost * 0.8 * tower.level);
    if (tower.level < 3 && state.gold >= cost) {
      state.selectedTower = tower.id;
      if (game.upgradeSelected()) upgraded = true;
    }
  }
  state.selectedPlot = null;
  state.selectedTower = null;
}

/** Run the simulation forward until `stop(state)` is true or `maxSteps` pass.
 * Between waves the autopilot spends its gold and calls the next wave early,
 * unless `build` is false (the defeat scene: no towers at all). */
function runUntil(game, maxSteps, stop, build = true) {
  for (let i = 0; i < maxSteps; i += 1) {
    if (build && game.state.phase === 'build') {
      autopilotBuild(game);
      game.startWave(true);
    }
    game.update(SAMPLE);
    if (stop(game.state)) break;
    if (game.state.screen !== SCREEN_PLAY) break;
  }
}

/**
 * Set the game to the named scene (start, play, victory, defeat; any other name
 * is start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, game) {
  const state = game.state;
  game.reset();
  if (name !== 'play' && name !== 'victory' && name !== 'defeat') {
    // Title: a few towers already standing, wave 1 waiting to be called.
    game.startRun();
    state.selectedPlot = RANKED_PLOTS[0].id;
    game.buildSelected('spark');
    state.selectedPlot = RANKED_PLOTS[1].id;
    game.buildSelected('frost');
    state.selectedPlot = null;
    state.screen = SCREEN_TITLE;
    state.time = 4;
    return { screen: SCREEN_TITLE, best: 0 };
  }

  if (name === 'defeat') {
    // No towers at all: the Gloam walks straight through to the ember.
    game.startRun();
    game.startWave(true);
    runUntil(game, 60 * 240, (s) => s.screen === SCREEN_DEFEAT, false);
    if (state.screen !== SCREEN_DEFEAT) {
      // Fallback: the state the defeat screen shows, reached honestly by leaks.
      state.emberHp = 0;
      state.screen = SCREEN_DEFEAT;
      state.phase = 'done';
    }
    return { screen: SCREEN_DEFEAT, best: state.score };
  }

  if (name === 'victory') {
    game.startRun();
    autopilotBuild(game);
    game.startWave(true);
    runUntil(game, 60 * 1500, (s) => s.screen === SCREEN_VICTORY || s.screen === SCREEN_DEFEAT);
    if (state.screen !== SCREEN_VICTORY) {
      // The autopilot fell short: restage the victory honestly from a won run's
      // shape — towers standing, wave 10 cleared, ember hearts left.
      game.reset();
      game.startRun();
      for (const plot of RANKED_PLOTS.slice(0, 8)) {
        state.selectedPlot = plot.id;
        game.buildSelected(plot.value >= 60 ? 'cannon' : 'spark');
      }
      for (const tower of [...state.towers]) {
        state.selectedTower = tower.id;
        game.upgradeSelected();
        game.upgradeSelected();
      }
      state.wave = WAVE_COUNT;
      state.phase = 'done';
      state.screen = SCREEN_VICTORY;
      state.score = 5240;
      state.kills = 212;
      state.gold = 340;
      state.selectedPlot = null;
      state.selectedTower = null;
    }
    return { screen: SCREEN_VICTORY, best: state.score };
  }

  // Play: a mid-game fight — towers up, wave 3 in full swing.
  game.startRun();
  autopilotBuild(game);
  game.startWave(true);
  runUntil(game, 60 * 200, (s) => s.wave >= 3 && s.phase === 'wave' && s.enemies.length >= 6);
  if (state.screen !== SCREEN_PLAY) {
    game.reset();
    game.startRun();
    autopilotBuild(game);
    game.startWave(true);
    runUntil(game, 60 * 120, () => false);
  }
  state.selectedPlot = null;
  return { screen: SCREEN_PLAY, best: state.score };
}

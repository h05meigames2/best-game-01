// Emberlight Keep — deterministic screenshot scenes (?shot=...&seed=...).
// Each scene is staged by actually playing the real rules: the victory
// scene is a full honest autopilot win, the defeat scene a no-tower loss.

import { SCREEN_DEFEAT, SCREEN_VICTORY } from './config.js';
import { PLOTS } from './level.js';
import { TOWERS } from './config.js';
import { STEP } from './config.js';

const RANKED = [...PLOTS].sort((a, b) => b.value - a.value);

export function autopilotBuild(game) {
  const s = game.state;
  for (const plot of RANKED) {
    if (s.towers.some((t) => t.plotId === plot.id)) continue;
    const kind = plot.value >= 60 ? 'cannon' : 'spark';
    if (s.gold >= TOWERS[kind].cost) {
      s.selectedPlot = plot.id;
      game.buildSelected(kind);
    }
  }
  let up = true;
  while (up) {
    up = false;
    const tower = [...s.towers].sort((a, b) => a.level - b.level || a.spent - b.spent)[0];
    if (!tower) break;
    const cost = Math.round(TOWERS[tower.kind].cost * 0.8 * tower.level);
    if (tower.level < 3 && s.gold >= cost) {
      s.selectedTower = tower.id;
      if (game.upgradeSelected()) up = true;
    }
  }
  s.selectedPlot = null;
  s.selectedTower = null;
}

function stepUntil(game, cond, maxSteps) {
  let steps = 0;
  while (steps < maxSteps) {
    if (cond()) return true;
    if (game.state.screen === 'play') {
      if (game.state.phase === 'build' && game.state.wave < 10) {
        autopilotBuild(game);
        game.startWave(true);
      }
      game.update(STEP);
    } else {
      return cond();
    }
    steps += 1;
  }
  return cond();
}

export function stageShot(name, game) {
  if (name === 'start') {
    game.startRun();
    const st = game.state;
    // Decorative title scene: two towers already standing watch.
    st.gold = 1000;
    st.selectedPlot = PLOTS[0].id;
    game.buildSelected('spark');
    st.selectedPlot = PLOTS[5].id;
    game.buildSelected('cannon');
    st.screen = 'title';
    st.phase = 'build';
    st.wave = 0;
    st.selectedPlot = null;
    st.selectedTower = null;
    return snapshot(game.state);
  }
  if (name === 'play') {
    game.startRun();
    stepUntil(game, () => game.state.wave >= 2 && game.state.enemies.length >= 6, 60 * 600);
    return snapshot(game.state);
  }
  if (name === 'victory') {
    game.startRun();
    stepUntil(game, () => game.state.screen === SCREEN_VICTORY, 60 * 1800);
    return snapshot(game.state);
  }
  if (name === 'defeat') {
    game.startRun();
    let steps = 0;
    while (game.state.screen === 'play' && steps < 60 * 1800) {
      // No towers at all: keep calling waves until the ember dies.
      if (game.state.phase === 'build' && game.state.wave < 10) game.startWave(true);
      game.update(STEP);
      steps += 1;
    }
    return snapshot(game.state);
  }
  // Unknown scene: plain title.
  game.startRun();
  game.state.screen = 'title';
  return snapshot(game.state);
}

function snapshot(s) {
  return {
    screen: s.screen,
    wave: s.wave,
    kills: s.kills,
    score: s.score,
    emberHp: s.emberHp,
    towers: s.towers.length,
    enemies: s.enemies.length,
  };
}

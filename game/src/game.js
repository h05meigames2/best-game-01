// Emberlight Keep — game state machine: waves, economy, win/lose.
// Deterministic: fixed wave tables, fixed-step updates, no Math.random.

import {
  W, H, STEP, EMBER_MAX, START_GOLD, WAVE_COUNT, EARLY_CALL_BONUS,
  TOWERS, SCREEN_TITLE, SCREEN_PLAY, SCREEN_VICTORY, SCREEN_DEFEAT,
  towerStats, upgradeCost, sellValue,
} from './config.js';
import { PLOTS } from './level.js';
import { buildWave, makeEnemy } from './enemies.js';
import { acquireTarget, fireTower, updateProjectiles, updateEnemies, towerById, towerAtPlot } from './towers.js';

export { STEP, SCREEN_TITLE, SCREEN_PLAY, SCREEN_VICTORY, SCREEN_DEFEAT };
export { W, H };

const NO_AUDIO = new Proxy({}, { get: () => () => {} });

export function createGame(rng, audio) {
  const game = {
    rng: rng || null,
    state: null,
    startRun,
    buildSelected,
    upgradeSelected,
    sellSelected,
    startWave,
    callWave,
    update,
    togglePause,
    toggleSpeed,
    toggleMute,
    selectAt,
    deselect,
  };

  function freshState() {
    return {
      screen: SCREEN_TITLE,
      phase: 'build',
      wave: 0,
      gold: START_GOLD,
      emberHp: EMBER_MAX,
      score: 0,
      kills: 0,
      towers: [],
      enemies: [],
      projectiles: [],
      fx: [],
      selectedPlot: null,
      selectedTower: null,
      paused: false,
      speed: 1,
      muted: false,
      time: 0,
      spawnQueue: [],
      spawnTimer: 0,
      spawnInterval: 0.55,
      nextTowerId: 1,
      nextEnemyId: 1,
      stats: { leaks: 0, earned: 0, shots: 0 },
      message: 'The Gloam stirs beyond the treeline.',
      audio: audio || NO_AUDIO,
      seed: 1,
    };
  }

  game.state = freshState();

  function startRun() {
    const muted = game.state ? game.state.muted : false;
    game.state = freshState();
    game.state.muted = muted;
    game.state.screen = SCREEN_PLAY;
    game.state.phase = 'build';
    game.state.message = 'Build your towers, then call the wave.';
  }

  function buildSelected(kind) {
    const s = game.state;
    if (s.screen !== SCREEN_PLAY || s.phase !== 'build') return false;
    if (!s.selectedPlot) return false;
    const def = TOWERS[kind];
    if (!def) return false;
    if (towerAtPlot(s, s.selectedPlot)) return false;
    if (s.gold < def.cost) {
      s.message = `Not enough gold for ${def.name} (${def.cost}g).`;
      s.audio.error();
      return false;
    }
    const plot = PLOTS.find((p) => p.id === s.selectedPlot);
    if (!plot) return false;
    s.gold -= def.cost;
    const tower = {
      id: s.nextTowerId,
      kind,
      plotId: plot.id,
      x: plot.x,
      y: plot.y,
      level: 1,
      spent: def.cost,
      cooldown: 0,
      angle: -Math.PI / 2,
      kills: 0,
    };
    s.nextTowerId += 1;
    s.towers.push(tower);
    s.selectedPlot = null;
    s.selectedTower = tower.id;
    s.message = `${def.name} raised on the old stones.`;
    s.audio.build();
    return true;
  }

  function upgradeSelected() {
    const s = game.state;
    if (s.screen !== SCREEN_PLAY) return false;
    const tower = towerById(s, s.selectedTower);
    if (!tower || tower.level >= 3) return false;
    const cost = upgradeCost(tower.kind, tower.level);
    if (s.gold < cost) {
      s.message = `Upgrade needs ${cost}g.`;
      s.audio.error();
      return false;
    }
    s.gold -= cost;
    tower.spent += cost;
    tower.level += 1;
    s.message = `${TOWERS[tower.kind].name} rises to level ${tower.level}.`;
    s.audio.upgrade();
    return true;
  }

  function sellSelected() {
    const s = game.state;
    if (s.screen !== SCREEN_PLAY) return false;
    const tower = towerById(s, s.selectedTower);
    if (!tower) return false;
    s.gold += sellValue(tower);
    s.towers = s.towers.filter((t) => t.id !== tower.id);
    s.selectedTower = null;
    s.message = `${TOWERS[tower.kind].name} sold for ${sellValue(tower)}g.`;
    s.audio.sell();
    return true;
  }

  function startWave(early) {
    const s = game.state;
    if (s.screen !== SCREEN_PLAY || s.phase !== 'build') return false;
    if (s.wave >= WAVE_COUNT) return false;
    s.wave += 1;
    s.phase = 'wave';
    s.spawnQueue = buildWave(s.wave);
    s.spawnTimer = 0.4;
    s.selectedPlot = null;
    s.selectedTower = null;
    if (early) {
      s.gold += EARLY_CALL_BONUS;
      s.score += 15;
      s.message = `Wave ${s.wave} called early — +${EARLY_CALL_BONUS}g bonus.`;
    } else {
      s.message = `Wave ${s.wave} of ${WAVE_COUNT} — hold the ember!`;
    }
    s.audio.waveStart();
    return true;
  }

  function callWave() {
    return startWave(true);
  }

  function update(dt) {
    const s = game.state;
    if (!s || s.screen !== SCREEN_PLAY || s.paused) return;
    const step = dt * s.speed;
    s.time += step;

    // Spawn.
    if (s.phase === 'wave' && s.spawnQueue.length > 0) {
      s.spawnTimer -= step;
      if (s.spawnTimer <= 0) {
        const type = s.spawnQueue.shift();
        s.enemies.push(makeEnemy(s.nextEnemyId, type, s.wave));
        s.nextEnemyId += 1;
        s.spawnTimer = s.spawnInterval;
      }
    }

    // Towers fire.
    for (const tower of s.towers) {
      tower.cooldown -= step;
      if (tower.cooldown > 0) continue;
      const stats = towerStats(tower.kind, tower.level);
      const target = acquireTarget(tower, s.enemies, stats.range);
      if (!target) {
        tower.cooldown = 0.05;
        continue;
      }
      s.stats.shots += 1;
      fireTower(s, tower, target, s.time);
    }

    updateProjectiles(s, step);
    updateEnemies(s, step);

    // Decay fx.
    for (const f of s.fx) f.ttl -= step;
    s.fx = s.fx.filter((f) => f.ttl > 0);

    // Defeat.
    if (s.emberHp <= 0) {
      s.screen = SCREEN_DEFEAT;
      s.phase = 'build';
      s.enemies = [];
      s.message = 'The ember has gone out. The Gloam takes the keep.';
      s.audio.lose();
      return;
    }

    // Wave cleared.
    if (s.phase === 'wave' && s.spawnQueue.length === 0 && s.enemies.length === 0) {
      const bonus = 40 + 10 * s.wave;
      s.gold += bonus;
      s.score += 250;
      s.phase = 'build';
      s.audio.waveClear();
      if (s.wave >= WAVE_COUNT) {
        s.screen = SCREEN_VICTORY;
        s.score += s.emberHp * 100;
        s.message = `Victory! The ember still burns — ${s.emberHp}/${EMBER_MAX} hearts remain.`;
        s.audio.win();
      } else {
        s.message = `Wave ${s.wave} cleared! +${bonus}g. Build, upgrade, then call wave ${s.wave + 1}.`;
      }
    }
  }

  function togglePause() {
    const s = game.state;
    if (s.screen !== SCREEN_PLAY) return false;
    s.paused = !s.paused;
    s.message = s.paused ? 'Paused. Press P to resume.' : 'The watch resumes.';
    return s.paused;
  }

  function toggleSpeed() {
    const s = game.state;
    s.speed = s.speed === 1 ? 2 : 1;
    return s.speed;
  }

  function toggleMute() {
    const s = game.state;
    s.muted = !s.muted;
    if (s.audio.setMuted) s.audio.setMuted(s.muted);
    return s.muted;
  }

  // Click handling in logical coordinates. Returns what was hit.
  function selectAt(x, y) {
    const s = game.state;
    if (s.screen === SCREEN_TITLE) {
      if (x >= 480 && x <= 800 && y >= 340 && y <= 420) {
        startRun();
        return 'start';
      }
      return 'title';
    }
    if (s.screen !== SCREEN_PLAY) {
      // Victory / defeat: click the restart button.
      if (x >= 480 && x <= 800 && y >= 430 && y <= 500) {
        startRun();
        return 'restart';
      }
      return s.screen;
    }
    // HUD buttons (top bar, y 8..44).
    if (y >= 8 && y <= 44) {
      if (x >= 980 && x <= 1100) {
        startWave(true);
        return 'wave';
      }
      if (x >= 1110 && x <= 1150) {
        toggleSpeed();
        return 'speed';
      }
      if (x >= 1160 && x <= 1200) {
        togglePause();
        return 'pause';
      }
      if (x >= 1210 && x <= 1250) {
        toggleMute();
        return 'mute';
      }
    }
    // Build panel cards (when a plot is selected).
    if (s.selectedPlot) {
      const panel = panelRect(s.selectedPlot);
      if (panel && x >= panel.x && x <= panel.x + panel.w && y >= panel.y && y <= panel.y + panel.h) {
        const card = cardAt(panel, x, y);
        if (card) {
          buildSelected(card);
          return 'build';
        }
        return 'panel';
      }
    }
    // Upgrade panel buttons (when a tower is selected).
    if (s.selectedTower) {
      const tower = towerById(s, s.selectedTower);
      if (tower) {
        const panel = upgradePanelRect(tower);
        if (x >= panel.x && x <= panel.x + panel.w && y >= panel.y && y <= panel.y + panel.h) {
          if (x >= panel.x + 16 && x <= panel.x + 216 && y >= panel.y + 40 && y <= panel.y + 124) {
            upgradeSelected();
            return 'upgrade';
          }
          if (x >= panel.x + 232 && x <= panel.x + 432 && y >= panel.y + 40 && y <= panel.y + 124) {
            sellSelected();
            return 'sell';
          }
          return 'panel';
        }
      }
    }
    // Towers first (they sit on plots).
    for (const tower of s.towers) {
      if (Math.hypot(x - tower.x, y - tower.y) <= 30) {
        s.selectedTower = tower.id;
        s.selectedPlot = null;
        s.message = `${TOWERS[tower.kind].name} level ${tower.level} — ${tower.kills} kills.`;
        s.audio.click();
        return 'tower';
      }
    }
    // Plots.
    for (const plot of PLOTS) {
      if (Math.hypot(x - plot.x, y - plot.y) <= 30) {
        s.selectedPlot = plot.id;
        s.selectedTower = null;
        s.message = `Old stones — pick a tower to raise here (keys 1–4).`;
        s.audio.click();
        return 'plot';
      }
    }
    s.selectedPlot = null;
    s.selectedTower = null;
    return 'empty';
  }

  function deselect() {
    game.state.selectedPlot = null;
    game.state.selectedTower = null;
  }

  return game;
}

// Panel geometry — shared with render.js so clicks and drawing agree.
export function panelRect(plotId) {
  const plot = PLOTS.find((p) => p.id === plotId);
  if (!plot) return null;
  const w = 628;
  const h = 150;
  const x = Math.max(8, Math.min(652, plot.x - 310));
  let y = plot.y + 78;
  if (y + h > 712) y = plot.y - 78 - h;
  return { x, y, w, h, plot };
}

export function cardAt(panel, x, y) {
  const order = ['spark', 'frost', 'cannon', 'prism'];
  for (let i = 0; i < 4; i += 1) {
    const cx = panel.x + 16 + i * 152;
    const cy = panel.y + 40;
    if (x >= cx && x <= cx + 144 && y >= cy && y <= cy + 84) return order[i];
  }
  return null;
}

export function upgradePanelRect(tower) {
  const w = 448;
  const h = 150;
  const x = Math.max(8, Math.min(1280 - w - 8, tower.x - 224));
  let y = tower.y + 78;
  if (y + h > 712) y = tower.y - 78 - h;
  return { x, y, w, h };
}

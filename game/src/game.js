// Emberlight Keep — the game itself: screens, economy, waves, win and loss.
// The rules live here; render.js only paints this state, shots.js only plays it.
import {
  EARLY_CALL_BONUS, EMBER, MAX_LEVEL, START_GOLD, STEP, TOWERS, TOWER_ORDER, WAVE_COUNT,
} from './config.js';
import { buildWave, PLOTS, PATH_LENGTH } from './level.js';
import { spawnEnemy, stepEnemy } from './enemies.js';
import { buildTower, sellValue, stepProjectiles, stepTower, upgradeCost, upgradeTower } from './towers.js';
import { createParticles } from './particles.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_VICTORY = 'victory';
export const SCREEN_DEFEAT = 'defeat';

/** Seconds of build time between waves. */
const BUILD_SECONDS = 14;

export function createGame(random, audio) {
  const particles = createParticles();
  const state = {
    screen: SCREEN_TITLE,
    time: 0,
    gold: START_GOLD,
    score: 0,
    kills: 0,
    emberHp: EMBER.hp,
    wave: 0,
    phase: 'build',
    buildTime: BUILD_SECONDS,
    waveTime: 0,
    spawnQueue: [],
    spawnIndex: 0,
    enemies: [],
    towers: [],
    projectiles: [],
    selectedPlot: null,
    selectedTower: null,
    hoverPlot: null,
    speed: 1,
    shake: 0,
    banner: null,
    stats: { leaks: 0, earned: 0, built: 0, shots: 0 },
    best: 0,
  };

  function showBanner(text, sub, seconds = 2.2) {
    state.banner = { text, sub, until: state.time + seconds };
  }

  function towerOnPlot(plotId) {
    return state.towers.find((t) => t.plotId === plotId) ?? null;
  }

  function reset() {
    state.screen = SCREEN_TITLE;
    state.time = 0;
    state.gold = START_GOLD;
    state.score = 0;
    state.kills = 0;
    state.emberHp = EMBER.hp;
    state.wave = 0;
    state.phase = 'build';
    state.buildTime = BUILD_SECONDS;
    state.waveTime = 0;
    state.spawnQueue = [];
    state.spawnIndex = 0;
    state.enemies = [];
    state.towers = [];
    state.projectiles = [];
    state.selectedPlot = null;
    state.selectedTower = null;
    state.hoverPlot = null;
    state.shake = 0;
    state.banner = null;
    state.stats = { leaks: 0, earned: 0, built: 0, shots: 0 };
    particles.clear();
  }

  function startRun() {
    reset();
    state.screen = SCREEN_PLAY;
    showBanner('Wave 1 approaches', 'Build your towers, then press Space', 3);
    audio.horn();
  }

  function startWave(early) {
    if (state.phase !== 'build' || state.screen !== SCREEN_PLAY) return false;
    if (early && state.buildTime > 0) {
      state.gold += EARLY_CALL_BONUS;
      state.stats.earned += EARLY_CALL_BONUS;
      particles.float(640, 90, `+${EARLY_CALL_BONUS} early call`, '#ffd166');
    }
    state.wave += 1;
    state.phase = 'wave';
    state.waveTime = 0;
    state.spawnQueue = buildWave(state.wave);
    state.spawnIndex = 0;
    showBanner(`Wave ${state.wave} of ${WAVE_COUNT}`, state.wave === WAVE_COUNT ? 'The Gloam Herald comes' : '', 2.2);
    audio.horn();
    return true;
  }

  function waveCleared() {
    const bonus = 40 + 10 * state.wave;
    state.gold += bonus;
    state.stats.earned += bonus;
    state.score += 100 * state.wave;
    particles.float(640, 120, `Wave clear +${bonus} gold`, '#ffd166');
    audio.waveClear();
    if (state.wave >= WAVE_COUNT) {
      state.phase = 'done';
      state.screen = SCREEN_VICTORY;
      state.score += state.emberHp * 50;
      audio.win();
      return;
    }
    state.phase = 'build';
    state.buildTime = BUILD_SECONDS;
    showBanner(`Wave ${state.wave} cleared`, `+${bonus} gold — build, then call wave ${state.wave + 1}`, 2.6);
  }

  function defeat() {
    state.phase = 'done';
    state.screen = SCREEN_DEFEAT;
    state.shake = 0.6;
    audio.lose();
  }

  function killEnemy(enemy) {
    state.gold += enemy.gold;
    state.stats.earned += enemy.gold;
    state.score += enemy.score;
    state.kills += 1;
    particles.burst(enemy.x, enemy.y, enemy.color, 10, 130);
    particles.float(enemy.x, enemy.y - 14, `+${enemy.gold}`, '#ffd166');
    audio.coin();
  }

  function leakEnemy(enemy) {
    state.emberHp -= enemy.leak;
    state.stats.leaks += 1;
    state.shake = 0.45;
    particles.burst(EMBER.x, EMBER.y, '#ff6b6b', 16, 180);
    audio.leak();
    if (state.emberHp <= 0) {
      state.emberHp = 0;
      defeat();
    }
  }

  /** One fixed step of the simulation; called only while playing. */
  function update(dt) {
    state.time += dt;
    state.shake = Math.max(0, state.shake - dt);
    if (state.banner && state.time > state.banner.until) state.banner = null;

    if (state.phase === 'build') {
      state.buildTime -= dt;
      if (state.buildTime <= 0) startWave(false);
    }

    if (state.phase === 'wave') {
      state.waveTime += dt;
      while (state.spawnIndex < state.spawnQueue.length && state.spawnQueue[state.spawnIndex].at <= state.waveTime) {
        const entry = state.spawnQueue[state.spawnIndex];
        state.spawnIndex += 1;
        state.enemies.push(spawnEnemy(entry.kind, state.wave, random));
      }
      if (state.spawnIndex >= state.spawnQueue.length && state.enemies.length === 0) {
        waveCleared();
      }
    }

    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      if (stepEnemy(enemy, dt, state.time) === 'leaked') {
        state.enemies.splice(i, 1);
        leakEnemy(enemy);
        if (state.screen === SCREEN_DEFEAT) return;
        continue;
      }
      if (enemy.dead) {
        state.enemies.splice(i, 1);
        killEnemy(enemy);
      }
    }

    for (const tower of state.towers) {
      const event = stepTower(tower, state.enemies, state.projectiles, dt, state.time, random);
      if (!event) continue;
      state.stats.shots += 1;
      audio.shoot(event.kind);
      if (event.type === 'beam') {
        particles.beam(event.fromX, event.fromY, event.toX, event.toY, '#c792ff');
        particles.burst(event.toX, event.toY, '#e9d5ff', 6, 90);
        if (event.killed) particles.burst(event.toX, event.toY, event.target.color, 10, 130);
      } else if (event.type === 'chill') {
        particles.ring(event.x, event.y, '#7dd7ff', 26);
      } else if (event.type === 'shot' && event.kind === 'bolt') {
        particles.beam(event.fromX, event.fromY, event.toX, event.toY, '#ffd166');
      }
    }

    for (const burst of stepProjectiles(state.projectiles, state.enemies, dt, random)) {
      particles.burst(burst.x, burst.y, '#ff7a59', 14, 170);
      particles.ring(burst.x, burst.y, '#ffb347', burst.radius);
      audio.hit();
      for (const enemy of burst.killed) {
        particles.burst(enemy.x, enemy.y, enemy.color, 10, 130);
      }
    }

    // Kills from instant weapons are collected on the next enemy pass; sweep
    // the dead here too so a beam kill never lingers a frame.
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      if (state.enemies[i].dead) {
        const enemy = state.enemies[i];
        state.enemies.splice(i, 1);
        killEnemy(enemy);
      }
    }

    particles.step(dt);
  }

  // --- Player actions -------------------------------------------------------

  function selectAt(x, y) {
    state.selectedTower = null;
    state.selectedPlot = null;
    for (const plot of PLOTS) {
      if (Math.hypot(plot.x - x, plot.y - y) <= 34) {
        state.selectedPlot = plot.id;
        const tower = towerOnPlot(plot.id);
        if (tower) state.selectedTower = tower.id;
        audio.click();
        return true;
      }
    }
    return false;
  }

  function buildSelected(kind) {
    if (state.selectedPlot === null || state.screen !== SCREEN_PLAY) return false;
    if (towerOnPlot(state.selectedPlot)) return false;
    const def = TOWERS[kind];
    if (!def || state.gold < def.cost) return false;
    const plot = PLOTS[state.selectedPlot];
    state.gold -= def.cost;
    const tower = buildTower(kind, plot);
    state.towers.push(tower);
    state.stats.built += 1;
    state.selectedTower = tower.id;
    particles.burst(plot.x, plot.y, def.color, 12, 120);
    audio.place();
    return true;
  }

  function selectedTowerObject() {
    return state.towers.find((t) => t.id === state.selectedTower) ?? null;
  }

  function upgradeSelected() {
    const tower = selectedTowerObject();
    if (!tower) return false;
    const cost = upgradeCost(tower);
    if (cost === 0 || state.gold < cost) return false;
    state.gold -= cost;
    upgradeTower(tower);
    particles.burst(tower.x, tower.y, TOWERS[tower.kind].color, 14, 140);
    audio.upgrade();
    return true;
  }

  function sellSelected() {
    const tower = selectedTowerObject();
    if (!tower) return false;
    state.gold += sellValue(tower);
    state.towers = state.towers.filter((t) => t.id !== tower.id);
    state.selectedTower = null;
    audio.sell();
    return true;
  }

  function togglePause() {
    if (state.screen === SCREEN_PLAY) state.screen = SCREEN_PAUSED;
    else if (state.screen === SCREEN_PAUSED) state.screen = SCREEN_PLAY;
  }

  function toggleSpeed() {
    state.speed = state.speed === 1 ? 2 : 1;
  }

  return {
    state,
    particles,
    reset,
    startRun,
    startWave,
    update,
    selectAt,
    buildSelected,
    upgradeSelected,
    sellSelected,
    selectedTowerObject,
    towerOnPlot,
    togglePause,
    toggleSpeed,
    towerKinds: TOWER_ORDER,
  };
}

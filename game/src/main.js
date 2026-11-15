// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between five screens: title, play,
// paused, victory and defeat.
//
// ?seed=N fixes the spawn pattern. ?shot=start|play|victory|defeat (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { ACTION_CANCEL, ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, ACTION_SPEED, createInput } from './input.js';
import { createGame, SCREEN_DEFEAT, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './game.js';
import { PLOTS } from './level.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const game = createGame(createRandom(seed), audio);
const renderer = createRenderer(canvas);
const input = createInput(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, game);
  let painted = 0;
  function paint() {
    renderer.draw(game.state, scene.screen, scene.best, game.particles);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    game.startRun();
    screen = SCREEN_PLAY;
    accumulator = 0;
    announce('Playing. Defend the ember for 10 waves.');
  }

  function endGame() {
    if (game.state.score > best) {
      best = game.state.score;
      saveBest(best);
    }
    announce(screen === SCREEN_VICTORY
      ? `Victory. Score ${game.state.score}. Best ${best}.`
      : `The ember died. Score ${game.state.score}. Best ${best}.`);
  }

  function handleClick(x, y) {
    audio.unlock();
    if (screen === SCREEN_TITLE || screen === SCREEN_VICTORY || screen === SCREEN_DEFEAT) {
      startGame();
      return;
    }
    const hit = renderer.uiHit(game.state, x, y);
    if (hit) {
      if (hit.action === 'speed') { game.toggleSpeed(); return; }
      if (hit.action === 'pause') { game.togglePause(); screen = game.state.screen; return; }
      if (hit.action === 'mute') { audio.setMuted(!audio.isMuted()); return; }
      if (hit.action === 'call') { game.startWave(true); return; }
      if (hit.action === 'build') { game.buildSelected(hit.kind); return; }
      if (hit.action === 'upgrade') { game.upgradeSelected(); return; }
      if (hit.action === 'sell') { game.sellSelected(); return; }
      if (hit.action === 'close') { game.state.selectedPlot = null; game.state.selectedTower = null; return; }
      return; // 'panel': a click inside the panel that hit nothing actionable.
    }
    if (screen === SCREEN_PLAY) {
      if (!game.selectAt(x, y)) {
        game.state.selectedPlot = null;
        game.state.selectedTower = null;
      }
    }
  }

  function handleKey(action) {
    audio.unlock();
    if (action === ACTION_MUTE) {
      audio.setMuted(!audio.isMuted());
      return;
    }
    if (screen === SCREEN_TITLE && action === ACTION_CONFIRM) { startGame(); return; }
    if ((screen === SCREEN_VICTORY || screen === SCREEN_DEFEAT) && (action === ACTION_CONFIRM || action === ACTION_RESTART)) {
      startGame();
      return;
    }
    if (action === ACTION_RESTART && screen === SCREEN_PLAY) { startGame(); return; }
    if (action === ACTION_PAUSE) {
      if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
        game.togglePause();
        screen = game.state.screen;
      }
      return;
    }
    if (action === ACTION_SPEED && screen === SCREEN_PLAY) { game.toggleSpeed(); return; }
    if (action === ACTION_CONFIRM && screen === SCREEN_PLAY) { game.startWave(true); return; }
    if (action === ACTION_CANCEL && screen === SCREEN_PLAY) {
      game.state.selectedPlot = null;
      game.state.selectedTower = null;
      return;
    }
    if (screen === SCREEN_PLAY && action.startsWith('build-')) {
      const index = Number(action.slice(6)) - 1;
      const kind = game.towerKinds[index];
      if (kind) game.buildSelected(kind);
    }
  }

  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    // Hover tracking for the build panel's range preview and plot highlight.
    const mouse = input.mouse;
    if (mouse.inside && screen === SCREEN_PLAY) {
      const hit = renderer.uiHit(game.state, mouse.x, mouse.y);
      game.state.hoverKind = hit && hit.action === 'build' ? hit.kind : null;
      let hover = null;
      for (const plot of PLOTS) {
        if (Math.hypot(plot.x - mouse.x, plot.y - mouse.y) <= 34) { hover = plot.id; break; }
      }
      game.state.hoverPlot = hover;
    } else {
      game.state.hoverKind = null;
      game.state.hoverPlot = null;
    }
    for (const event of input.drain()) {
      if (event.kind === 'click') handleClick(event.x, event.y);
      else if (event.kind === 'key') handleKey(event.action);
    }
    if (screen === SCREEN_PLAY) {
      accumulator += elapsed * game.state.speed;
      while (accumulator >= STEP) {
        game.update(STEP);
        accumulator -= STEP;
        if (game.state.screen !== SCREEN_PLAY) {
          screen = game.state.screen;
          if (screen === SCREEN_VICTORY || screen === SCREEN_DEFEAT) endGame();
          break;
        }
      }
    } else {
      // The ember flame still flickers on the title and end screens.
      game.state.time += elapsed;
      game.particles.step(elapsed);
    }
    renderer.draw(game.state, screen, best, game.particles);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

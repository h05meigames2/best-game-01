// Emberlight Keep — entry point: canvas setup, main loop, shot mode.

import { W, H, STEP } from './config.js';
import { createRandom } from './random.js';
import { createGame } from './game.js';
import { render } from './render.js';
import { createAudio } from './audio.js';
import { attachInput } from './input.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '1') || 1;
const shot = params.get('shot');

canvas.width = W;
canvas.height = H;

function fitCanvas() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

const audio = createAudio();
const game = createGame(createRandom(seed), audio);
game.state.seed = seed;
window.__game = game;

attachInput(canvas, game, (x, y) => {
  // Canvas is letterboxed 1:1 at 1280x720 logical; input already maps
  // client pixels onto the logical plane.
  return { x, y };
});

function updateStatus() {
  if (!statusEl) return;
  const s = game.state;
  const screenWord =
    s.screen === 'title' ? 'Title screen' :
    s.screen === 'victory' ? 'Victory' :
    s.screen === 'defeat' ? 'Defeat' :
    s.paused ? 'Paused' : `Wave ${s.wave} of 10`;
  statusEl.textContent =
    `Emberlight Keep — ${screenWord}. Ember ${s.emberHp} of 20 hearts. ` +
    `Gold ${s.gold}. Score ${s.score}. Kills ${s.kills}. ${s.message}`;
}

if (shot) {
  // Deterministic screenshot scene: stage it, render once, signal ready.
  stageShot(shot, game);
  render(ctx, game, 1000);
  updateStatus();
  window.__shotReady = true;
  // Keep rendering the frozen scene so the frame stays alive.
  const loop = () => {
    render(ctx, game, 1000);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
} else {
  let last = performance.now();
  let acc = 0;
  let statusTimer = 0;
  const loop = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (game.state.screen === 'play' && !game.state.paused) {
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < 8) {
        game.update(STEP);
        acc -= STEP;
        n += 1;
      }
      if (n === 8) acc = 0;
    }
    render(ctx, game, now);
    statusTimer += dt;
    if (statusTimer > 0.25) {
      statusTimer = 0;
      updateStatus();
    }
    requestAnimationFrame(loop);
  };
  updateStatus();
  requestAnimationFrame(loop);
}

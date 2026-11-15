// Emberlight Keep — mouse + keyboard input (logical 1280x720 coordinates).

import { TOWER_ORDER } from './config.js';

export function attachInput(canvas, game, toLogical) {
  function logicalFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 1280;
    const y = ((e.clientY - rect.top) / rect.height) * 720;
    return toLogical ? toLogical(x, y) : { x, y };
  }

  canvas.addEventListener('click', (e) => {
    const { x, y } = logicalFromEvent(e);
    game.selectAt(x, y);
  });

  window.addEventListener('keydown', (e) => {
    const s = game.state;
    if (e.code === 'Space') {
      e.preventDefault();
      if (s.screen === 'play') game.startWave(true);
      else if (s.screen === 'title') game.startRun();
      return;
    }
    if (s.screen !== 'play') {
      if ((e.code === 'KeyR' || e.code === 'Enter') && (s.screen === 'victory' || s.screen === 'defeat')) {
        game.startRun();
      }
      return;
    }
    if (e.code === 'KeyP') game.togglePause();
    else if (e.code === 'KeyF') game.toggleSpeed();
    else if (e.code === 'KeyM') game.toggleMute();
    else if (e.code === 'KeyR') game.startRun();
    else if (e.code === 'Escape') game.deselect();
    else if (e.code.startsWith('Digit')) {
      const n = Number(e.code.slice(5));
      if (n >= 1 && n <= 4 && s.selectedPlot) {
        game.buildSelected(TOWER_ORDER[n - 1]);
      }
    }
  });
}

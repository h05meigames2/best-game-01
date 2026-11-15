// Keyboard and mouse, in the game's own logical coordinates (1280x720).
// The renderer hands it the current scale and offset so a click on the canvas
// lands on the same spot the player sees.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';
export const ACTION_SPEED = 'speed';
export const ACTION_RESTART = 'restart';
export const ACTION_CANCEL = 'cancel';

export function createInput(canvas) {
  const mouse = { x: 0, y: 0, inside: false };
  const pressed = new Set();
  const queue = [];
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - offsetX) / scale,
      y: (event.clientY - rect.top - offsetY) / scale,
    };
  }

  canvas.addEventListener('mousemove', (event) => {
    const point = toLogical(event);
    mouse.x = point.x;
    mouse.y = point.y;
    mouse.inside = true;
  });
  canvas.addEventListener('mouseleave', () => { mouse.inside = false; });
  canvas.addEventListener('mousedown', (event) => {
    const point = toLogical(event);
    mouse.x = point.x;
    mouse.y = point.y;
    queue.push({ kind: 'click', x: point.x, y: point.y, button: event.button });
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    let action = null;
    if (key === ' ' || key === 'enter') action = ACTION_CONFIRM;
    else if (key === 'p' || key === 'escape') action = ACTION_PAUSE;
    else if (key === 'm') action = ACTION_MUTE;
    else if (key === 'f') action = ACTION_SPEED;
    else if (key === 'r') action = ACTION_RESTART;
    if (action) {
      event.preventDefault();
      queue.push({ kind: 'key', action });
    } else if (['1', '2', '3', '4'].includes(key)) {
      queue.push({ kind: 'key', action: `build-${key}` });
    }
  });

  return {
    mouse,
    /** The renderer calls this every frame so clicks map to the drawn field. */
    setTransform(nextScale, nextOffsetX, nextOffsetY) {
      scale = nextScale;
      offsetX = nextOffsetX;
      offsetY = nextOffsetY;
    },
    /** Drain this frame's events, oldest first. */
    drain() {
      const events = queue.splice(0, queue.length);
      return events;
    },
    isDown(code) { return pressed.has(code); },
  };
}

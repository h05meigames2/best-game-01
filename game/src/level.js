// Emberlight Keep — the road the Gloam walks, the ember at its end,
// and the stone plots where towers may be built.

export const PATH = [
  { x: -40, y: 150 },
  { x: 260, y: 150 },
  { x: 260, y: 340 },
  { x: 580, y: 340 },
  { x: 580, y: 560 },
  { x: 920, y: 560 },
  { x: 920, y: 200 },
  { x: 1200, y: 200 },
];

export const EMBER = { x: 1218, y: 200 };

// value = how much road a tower on this plot can cover (used by the
// autopilot and shown to the player as a small star rating).
export const PLOTS = [
  { id: 1, x: 200, y: 200, value: 55 },
  { id: 2, x: 380, y: 220, value: 70 },
  { id: 3, x: 180, y: 420, value: 45 },
  { id: 4, x: 420, y: 420, value: 65 },
  { id: 5, x: 700, y: 430, value: 60 },
  { id: 6, x: 480, y: 240, value: 75 },
  { id: 7, x: 700, y: 640, value: 50 },
  { id: 8, x: 820, y: 300, value: 70 },
  { id: 9, x: 1020, y: 340, value: 80 },
  { id: 10, x: 1020, y: 120, value: 55 },
  { id: 11, x: 340, y: 560, value: 40 },
  { id: 12, x: 860, y: 640, value: 45 },
];

export function pathLength() {
  let total = 0;
  for (let i = 0; i < PATH.length - 1; i += 1) {
    total += Math.hypot(PATH[i + 1].x - PATH[i].x, PATH[i + 1].y - PATH[i].y);
  }
  return total;
}

export const TOTAL_PATH = pathLength();

// Position on the road at distance d from the entrance.
export function pointAt(d) {
  let rest = Math.max(0, d);
  for (let i = 0; i < PATH.length - 1; i += 1) {
    const a = PATH[i];
    const b = PATH[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (rest <= len) {
      const t = len === 0 ? 0 : rest / len;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, seg: i };
    }
    rest -= len;
  }
  const last = PATH[PATH.length - 1];
  return { x: last.x, y: last.y, seg: PATH.length - 2 };
}

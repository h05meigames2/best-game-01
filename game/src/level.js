// The battlefield: the winding path the Gloam walks, the stone plots where towers
// may be built, and the ten waves. A plot's value is how much path sits inside a
// tower's reach from it — the autopilot (shots.js) and the player both read it.
import { ENEMIES, HP_PER_WAVE, SPEED_PER_WAVE, WAVE_COUNT } from './config.js';

/** Waypoints of the path, from the western gate to the ember lantern. */
export const PATH = [
  { x: -20, y: 110 },
  { x: 330, y: 110 },
  { x: 330, y: 360 },
  { x: 690, y: 360 },
  { x: 690, y: 590 },
  { x: 1010, y: 590 },
  { x: 1010, y: 300 },
  { x: 1180, y: 300 },
];

/** Total path length, for enemy progress. */
export const PATH_LENGTH = (() => {
  let total = 0;
  for (let i = 1; i < PATH.length; i += 1) {
    total += Math.hypot(PATH[i].x - PATH[i - 1].x, PATH[i].y - PATH[i - 1].y);
  }
  return total;
})();

/** Stone plots beside the path. `value` counts path points within a Spark tower's reach. */
export const PLOTS = (() => {
  const spots = [
    { x: 200, y: 200 }, { x: 430, y: 200 }, { x: 430, y: 460 }, { x: 240, y: 470 },
    { x: 560, y: 240 }, { x: 790, y: 250 }, { x: 790, y: 470 }, { x: 590, y: 500 },
    { x: 880, y: 680 }, { x: 1110, y: 680 }, { x: 1110, y: 470 }, { x: 900, y: 180 },
    { x: 1140, y: 180 }, { x: 80, y: 300 },
  ];
  return spots.map((spot, index) => {
    let value = 0;
    for (let px = 0; px <= PATH_LENGTH; px += 8) {
      const point = pointAt(px);
      if (Math.hypot(point.x - spot.x, point.y - spot.y) <= 135) value += 1;
    }
    return { id: index, x: spot.x, y: spot.y, value };
  });
})();

/** The point `distance` along the path from its start. */
export function pointAt(distance) {
  let left = Math.max(0, Math.min(PATH_LENGTH, distance));
  for (let i = 1; i < PATH.length; i += 1) {
    const a = PATH[i - 1];
    const b = PATH[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= seg) {
      const t = seg === 0 ? 0 : left / seg;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    left -= seg;
  }
  return { x: PATH[PATH.length - 1].x, y: PATH[PATH.length - 1].y };
}

/** Wave compositions: each entry is [kind, count, gapSeconds]. */
function waveList(wave) {
  switch (wave) {
    case 1: return [['wisp', 8, 1.0]];
    case 2: return [['wisp', 10, 0.9], ['crawler', 4, 1.1]];
    case 3: return [['wisp', 8, 0.8], ['crawler', 8, 0.9], ['flutter', 4, 0.8]];
    case 4: return [['crawler', 12, 0.8], ['flutter', 8, 0.7], ['wisp', 10, 0.6]];
    case 5: return [['brute', 3, 1.6], ['crawler', 12, 0.7], ['wisp', 12, 0.55]];
    case 6: return [['flutter', 14, 0.6], ['brute', 4, 1.5], ['crawler', 10, 0.7]];
    case 7: return [['brute', 6, 1.3], ['flutter', 12, 0.55], ['wisp', 16, 0.45]];
    case 8: return [['brute', 8, 1.2], ['crawler', 16, 0.55], ['flutter', 14, 0.5]];
    case 9: return [['brute', 10, 1.1], ['flutter', 18, 0.45], ['crawler', 18, 0.5], ['wisp', 18, 0.4]];
    case 10: return [['herald', 1, 1.0], ['brute', 6, 1.4], ['flutter', 12, 0.6], ['crawler', 12, 0.7]];
    default: return [['wisp', 6, 1.0]];
  }
}

/** Build the spawn queue for a wave: a flat list of {kind, at} in seconds. */
export function buildWave(wave) {
  const queue = [];
  let at = 0.5;
  for (const [kind, count, gap] of waveList(wave)) {
    for (let i = 0; i < count; i += 1) {
      queue.push({ kind, at });
      at += gap;
    }
    at += 1.5;
  }
  return queue;
}

/** Scaled stats for an enemy kind on a given wave. */
export function enemyStats(kind, wave) {
  const base = ENEMIES[kind];
  return {
    ...base,
    hp: Math.round(base.hp * (1 + HP_PER_WAVE * (wave - 1))),
    speed: base.speed * (1 + SPEED_PER_WAVE * (wave - 1)),
  };
}

export { WAVE_COUNT };

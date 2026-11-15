// Emberlight Keep — the Gloam: five enemy kinds, deterministic waves.
// Wave composition is a fixed table (no randomness), so every seed plays
// the same battle and scores identically.

export const ENEMY_TYPES = {
  emberling: {
    key: 'emberling', name: 'Emberling',
    hp: 30, speed: 62, reward: 6, leak: 1, radius: 11,
    color: '#8a5cff', dark: '#4b2a9e', shape: 'blob',
  },
  skitter: {
    key: 'skitter', name: 'Skitter',
    hp: 18, speed: 105, reward: 7, leak: 1, radius: 9,
    color: '#ff5c8a', dark: '#a11e4b', shape: 'dart',
  },
  husk: {
    key: 'husk', name: 'Husk',
    hp: 95, speed: 42, reward: 12, leak: 2, radius: 15,
    color: '#5c8a6a', dark: '#2c4a35', shape: 'brute',
  },
  wisp: {
    key: 'wisp', name: 'Wisp',
    hp: 14, speed: 120, reward: 8, leak: 1, radius: 8,
    color: '#ffe066', dark: '#a8871a', shape: 'wisp',
  },
  gloomlord: {
    key: 'gloomlord', name: 'Gloomlord',
    hp: 620, speed: 30, reward: 100, leak: 5, radius: 24,
    color: '#2b1b4d', dark: '#120a24', shape: 'lord',
  },
};

// Fixed spawn pattern, cycled per wave. Deterministic by construction.
const PATTERN = [
  'emberling', 'emberling', 'skitter', 'emberling', 'wisp',
  'emberling', 'husk', 'skitter', 'emberling', 'wisp',
  'emberling', 'skitter', 'husk', 'emberling', 'emberling',
  'wisp', 'skitter', 'emberling', 'husk', 'emberling',
];

export function hpScale(wave) {
  return 1 + 0.3 * (wave - 1);
}

// Count of regular enemies in a wave (bosses are extra, wave 10 only).
export function waveCount(wave) {
  return 8 + 4 * wave;
}

// Full spawn list for a wave: array of enemy type keys, in spawn order.
export function buildWave(wave) {
  const list = [];
  const n = waveCount(wave);
  for (let i = 0; i < n; i += 1) {
    // Rotate the pattern by wave so each wave opens differently.
    list.push(PATTERN[(i + (wave - 1) * 3) % PATTERN.length]);
  }
  if (wave >= 10) {
    list.push('gloomlord', 'gloomlord', 'gloomlord');
  } else if (wave >= 5) {
    list.push('husk');
  }
  return list;
}

export function makeEnemy(id, typeKey, wave) {
  const t = ENEMY_TYPES[typeKey];
  const hp = Math.round(t.hp * hpScale(wave));
  return {
    id,
    type: typeKey,
    name: t.name,
    hp,
    maxHp: hp,
    speed: t.speed,
    reward: t.reward,
    leak: t.leak,
    radius: t.radius,
    color: t.color,
    dark: t.dark,
    shape: t.shape,
    dist: 0,
    x: -40,
    y: 150,
    seg: 0,
    slowUntil: 0,
    slowFactor: 1,
    flash: 0,
  };
}

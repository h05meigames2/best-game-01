// Emberlight Keep — shared constants and tower definitions.
// Original game: defend the last ember at the end of the Gloam road.

export const W = 1280;
export const H = 720;
export const STEP = 1 / 60;
export const EMBER_MAX = 20;
export const START_GOLD = 320;
export const WAVE_COUNT = 10;
export const EARLY_CALL_BONUS = 25;

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_VICTORY = 'victory';
export const SCREEN_DEFEAT = 'defeat';

// Damage multiplier per tower level (index 0 = level 1).
export const LEVEL_DAMAGE = [1, 1.5, 2.25];
export const LEVEL_RANGE = [0, 12, 24];

export const TOWERS = {
  spark: {
    key: 'spark',
    name: 'Spark Spire',
    cost: 60,
    damage: 6,
    rate: 1.8,
    range: 105,
    projSpeed: 460,
    splash: 0,
    slow: 0,
    slowDur: 0,
    chain: 1,
    color: '#ffb347',
    dark: '#b96a00',
    desc: 'Fast ember bolts. Cheap and reliable.',
  },
  frost: {
    key: 'frost',
    name: 'Frost Lantern',
    cost: 80,
    damage: 4,
    rate: 1.2,
    range: 115,
    projSpeed: 380,
    splash: 0,
    slow: 0.45,
    slowDur: 1.2,
    chain: 1,
    color: '#7fd4ff',
    dark: '#1d6f9e',
    desc: 'Chills the Gloam, slowing it by 45%.',
  },
  cannon: {
    key: 'cannon',
    name: 'Ember Cannon',
    cost: 120,
    damage: 17,
    rate: 0.65,
    range: 135,
    projSpeed: 340,
    splash: 55,
    slow: 0,
    slowDur: 0,
    chain: 1,
    color: '#ff7a4d',
    dark: '#a83a12',
    desc: 'Heavy shells that burst and hurt crowds.',
  },
  prism: {
    key: 'prism',
    name: 'Prism Obelisk',
    cost: 160,
    damage: 5,
    rate: 3.5,
    range: 155,
    projSpeed: 900,
    splash: 0,
    slow: 0,
    slowDur: 0,
    chain: 3,
    color: '#c58cff',
    dark: '#6b2fb0',
    desc: 'Rapid light that chains to 3 foes.',
  },
};

export const TOWER_ORDER = ['spark', 'frost', 'cannon', 'prism'];

export function towerStats(kind, level) {
  const base = TOWERS[kind];
  const i = Math.max(0, Math.min(2, level - 1));
  return {
    damage: Math.round(base.damage * LEVEL_DAMAGE[i]),
    rate: base.rate * (1 + 0.15 * i),
    range: base.range + LEVEL_RANGE[i],
    projSpeed: base.projSpeed,
    splash: base.splash,
    slow: base.slow,
    slowDur: base.slowDur,
    chain: base.chain,
    color: base.color,
    dark: base.dark,
  };
}

export function upgradeCost(kind, level) {
  return Math.round(TOWERS[kind].cost * 0.8 * level);
}

export function sellValue(tower) {
  return Math.floor(tower.spent * 0.7);
}

// Emberlight Keep — every tuning number, colour and definition in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The ember the player defends: hit points, and where the path ends. */
export const EMBER = { hp: 20, x: 1212, y: 300 };

export const START_GOLD = 120;

/** Waves in all: clearing wave 10 wins the game. */
export const WAVE_COUNT = 10;

/** Gold for calling the next wave while the build phase still has time left. */
export const EARLY_CALL_BONUS = 25;

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'emberlight-keep-best';

/** Tower kinds, in build-menu order. damage/rate are per level 1; each level
 *  multiplies damage by DAMAGE_PER_LEVEL and adds RANGE_PER_LEVEL range. */
export const TOWERS = {
  spark: {
    name: 'Spark Spire', short: 'Spark', key: '1',
    cost: 50, damage: 9, rate: 2.4, range: 135, projectile: 'bolt',
    color: '#ffd166', dark: '#b8860b',
    blurb: 'Fast sparks. Cheap, quick, reliable.',
  },
  frost: {
    name: 'Frost Lantern', short: 'Frost', key: '2',
    cost: 60, damage: 4, rate: 1.3, range: 125, projectile: 'chill',
    slow: 0.45, slowTime: 1.4, color: '#7dd7ff', dark: '#2b6cb0',
    blurb: 'Chills the Gloam, slowing it down.',
  },
  cannon: {
    name: 'Ember Cannon', short: 'Cannon', key: '3',
    cost: 90, damage: 26, rate: 0.75, range: 145, projectile: 'shell',
    splash: 62, color: '#ff7a59', dark: '#9c2b1b',
    blurb: 'Lobbed embers that burst and splash.',
  },
  prism: {
    name: 'Prism Obelisk', short: 'Prism', key: '4',
    cost: 120, damage: 34, rate: 0.9, range: 200, projectile: 'beam',
    color: '#c792ff', dark: '#6b21a8',
    blurb: 'A long lance of gathered light.',
  },
};
export const TOWER_ORDER = ['spark', 'frost', 'cannon', 'prism'];
export const MAX_LEVEL = 3;
export const DAMAGE_PER_LEVEL = 1.65;
export const RANGE_PER_LEVEL = 1.12;
/** Upgrade price is this share of the tower's base cost, times the new level. */
export const UPGRADE_SHARE = 0.8;
/** Selling returns this share of everything spent on the tower. */
export const SELL_SHARE = 0.7;

/** Enemy kinds. hp/speed scale with the wave (see level.js). */
export const ENEMIES = {
  wisp: {
    name: 'Wisp', hp: 30, speed: 72, gold: 6, score: 10, leak: 1,
    radius: 11, color: '#9aa7ff', dark: '#4c5fd5',
  },
  crawler: {
    name: 'Crawler', hp: 58, speed: 48, gold: 8, score: 15, leak: 1,
    radius: 13, color: '#7ee787', dark: '#2f7d32',
  },
  flutter: {
    name: 'Flutter', hp: 42, speed: 96, gold: 10, score: 20, leak: 1,
    radius: 10, color: '#ffb3d9', dark: '#b03060',
  },
  brute: {
    name: 'Brute', hp: 230, speed: 30, gold: 18, score: 40, leak: 3,
    radius: 18, color: '#ff9f43', dark: '#8a4b00',
  },
  herald: {
    name: 'Gloam Herald', hp: 2600, speed: 26, gold: 150, score: 500, leak: 10,
    radius: 26, color: '#e879f9', dark: '#701a75',
  },
};
/** Enemy hit points grow this much per wave, speed a little. */
export const HP_PER_WAVE = 0.17;
export const SPEED_PER_WAVE = 0.02;

export const PALETTE = {
  backdrop: '#0d1020',
  skyTop: '#131a33',
  skyBottom: '#1e2b4a',
  ground: '#1c2b26',
  groundDark: '#16221d',
  path: '#6b5a44',
  pathEdge: '#4a3f30',
  pathStone: '#8a7a5f',
  plot: '#2c3a4d',
  plotEdge: '#4a5f7d',
  plotHover: '#3d5470',
  ember: '#ffb347',
  emberCore: '#fff3c4',
  text: '#f2ead8',
  muted: '#9aa3b8',
  panel: '#20263acc',
  panelSolid: '#20263a',
  panelEdge: '#4a5468',
  gold: '#ffd166',
  heart: '#ff6b6b',
  danger: '#ff5d5d',
  ok: '#7ee787',
  button: '#31435e',
  buttonHover: '#3f5678',
  buttonEdge: '#5a6f92',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

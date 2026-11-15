// The Gloam: enemies that walk the path toward the ember. Each one carries its
// distance along the path, so movement is a single number and the renderer asks
// level.js where that distance sits on the ground.
import { enemyStats, PATH_LENGTH, pointAt } from './level.js';

let nextId = 1;

/** Make one enemy of `kind` for `wave`, at the path's start (or `distance` in). */
export function spawnEnemy(kind, wave, random, distance = 0) {
  const stats = enemyStats(kind, wave);
  return {
    id: nextId++,
    kind,
    name: stats.name,
    x: 0, y: 0,
    distance,
    hp: stats.hp,
    maxHp: stats.hp,
    speed: stats.speed,
    baseSpeed: stats.speed,
    radius: stats.radius,
    gold: stats.gold,
    score: stats.score,
    leak: stats.leak,
    color: stats.color,
    dark: stats.dark,
    slowUntil: 0,
    slowFactor: 1,
    wobble: random.next() * Math.PI * 2,
    dead: false,
    leaked: false,
  };
}

/** Advance one enemy one step; returns 'leaked' when it reaches the ember. */
export function stepEnemy(enemy, dt, time) {
  if (enemy.dead) return null;
  const slowed = time < enemy.slowUntil ? enemy.slowFactor : 1;
  enemy.distance += enemy.speed * slowed * dt;
  const point = pointAt(enemy.distance);
  const wobble = Math.sin(time * 3 + enemy.wobble) * 4;
  enemy.x = point.x;
  enemy.y = point.y + wobble;
  if (enemy.distance >= PATH_LENGTH) {
    enemy.leaked = true;
    return 'leaked';
  }
  return null;
}

/** Chill an enemy: it moves at (1 - factor) speed until `time + seconds`. */
export function chillEnemy(enemy, factor, seconds, time) {
  enemy.slowFactor = Math.min(enemy.slowFactor, 1 - factor);
  enemy.slowUntil = Math.max(enemy.slowUntil, time + seconds);
  if (time >= enemy.slowUntil) enemy.slowFactor = 1;
}

/** Damage an enemy; returns true when the hit kills it. */
export function hurtEnemy(enemy, damage) {
  if (enemy.dead) return false;
  enemy.hp -= damage;
  if (enemy.hp <= 0) {
    enemy.dead = true;
    return true;
  }
  return false;
}

export function resetEnemyIds() { nextId = 1; }

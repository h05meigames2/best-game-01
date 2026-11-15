// Towers: what they cost, how they aim and fire, and the shells and beams they
// throw. A tower is a plain object on a plot; projectiles live here too, as short
// flights from a muzzle to a target with a splash on arrival.
import {
  DAMAGE_PER_LEVEL, MAX_LEVEL, RANGE_PER_LEVEL, SELL_SHARE, TOWERS, UPGRADE_SHARE,
} from './config.js';
import { chillEnemy, hurtEnemy } from './enemies.js';

let nextId = 1;

/** Stats for a tower kind at a level: damage, range and fire rate. */
export function towerStats(kind, level) {
  const base = TOWERS[kind];
  return {
    ...base,
    damage: Math.round(base.damage * Math.pow(DAMAGE_PER_LEVEL, level - 1)),
    range: Math.round(base.range * Math.pow(RANGE_PER_LEVEL, level - 1)),
    rate: base.rate,
  };
}

/** Price to raise a tower to the next level (0 when already at the top). */
export function upgradeCost(tower) {
  if (tower.level >= MAX_LEVEL) return 0;
  return Math.round(TOWERS[tower.kind].cost * UPGRADE_SHARE * tower.level);
}

/** Gold returned for selling a tower. */
export function sellValue(tower) {
  return Math.floor(tower.spent * SELL_SHARE);
}

/** Place a fresh level-1 tower of `kind` on `plot`. */
export function buildTower(kind, plot) {
  const stats = towerStats(kind, 1);
  return {
    id: nextId++,
    kind,
    plotId: plot.id,
    x: plot.x,
    y: plot.y,
    level: 1,
    spent: stats.cost,
    cooldown: 0,
    angle: -Math.PI / 2,
    flash: 0,
    ...stats,
  };
}

/** Raise a tower one level, refreshing its stats. */
export function upgradeTower(tower) {
  const cost = upgradeCost(tower);
  if (cost === 0) return 0;
  tower.spent += cost;
  tower.level += 1;
  const stats = towerStats(tower.kind, tower.level);
  tower.damage = stats.damage;
  tower.range = stats.range;
  tower.rate = stats.rate;
  return cost;
}

/** Pick the target: the enemy furthest along the path inside range. */
function pickTarget(tower, enemies) {
  let best = null;
  let bestDistance = -1;
  for (const enemy of enemies) {
    if (enemy.dead || enemy.leaked) continue;
    const dx = enemy.x - tower.x;
    const dy = enemy.y - tower.y;
    if (dx * dx + dy * dy > tower.range * tower.range) continue;
    if (enemy.distance > bestDistance) {
      bestDistance = enemy.distance;
      best = enemy;
    }
  }
  return best;
}

/**
 * Fire one tower for a step. Returns events the game turns into sound and
 * particles: { type: 'shot'|'beam'|'chill', ... }. Damage is applied here for
 * instant weapons; shells fly and burst in stepProjectiles.
 */
export function stepTower(tower, enemies, projectiles, dt, time, random) {
  tower.cooldown -= dt;
  tower.flash = Math.max(0, tower.flash - dt * 6);
  if (tower.cooldown > 0) return null;
  const target = pickTarget(tower, enemies);
  if (!target) return null;
  tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
  tower.cooldown = 1 / tower.rate;
  tower.flash = 1;
  const def = TOWERS[tower.kind];
  if (tower.kind === 'cannon') {
    projectiles.push({
      kind: 'shell', x: tower.x, y: tower.y - 14,
      targetId: target.id, tx: target.x, ty: target.y,
      speed: 420, damage: tower.damage, splash: def.splash, color: def.color,
      trail: 0,
    });
    return { type: 'shot', kind: 'shell', x: tower.x, y: tower.y };
  }
  if (tower.kind === 'prism') {
    const killed = hurtEnemy(target, tower.damage);
    return { type: 'beam', kind: 'beam', fromX: tower.x, fromY: tower.y - 16, toX: target.x, toY: target.y, target, killed };
  }
  if (tower.kind === 'frost') {
    chillEnemy(target, def.slow, def.slowTime, time);
    const killed = hurtEnemy(target, tower.damage);
    return { type: 'chill', kind: 'chill', target, killed, x: target.x, y: target.y };
  }
  const killed = hurtEnemy(target, tower.damage);
  return { type: 'shot', kind: 'bolt', fromX: tower.x, fromY: tower.y - 14, toX: target.x, toY: target.y, target, killed };
}

/** Move shells toward their targets; burst and splash on arrival. */
export function stepProjectiles(projectiles, enemies, dt, random) {
  const bursts = [];
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const shell = projectiles[i];
    const dx = shell.tx - shell.x;
    const dy = shell.ty - shell.y;
    const dist = Math.hypot(dx, dy);
    const move = shell.speed * dt;
    if (dist <= move + 6) {
      projectiles.splice(i, 1);
      const hit = [];
      for (const enemy of enemies) {
        if (enemy.dead || enemy.leaked) continue;
        if (Math.hypot(enemy.x - shell.tx, enemy.y - shell.ty) <= shell.splash) {
          if (hurtEnemy(enemy, shell.damage)) hit.push(enemy);
        }
      }
      bursts.push({ x: shell.tx, y: shell.ty, radius: shell.splash, killed: hit });
    } else {
      shell.x += (dx / dist) * move;
      shell.y += (dy / dist) * move;
      shell.trail += dt;
    }
  }
  return bursts;
}

export function resetTowerIds() { nextId = 1; }

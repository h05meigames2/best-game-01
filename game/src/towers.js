// Emberlight Keep — tower behaviour: targeting, firing, projectiles.
// Pure rules; rendering lives in render.js.

import { towerStats } from './config.js';
import { pointAt, TOTAL_PATH } from './level.js';

export function towerAtPlot(state, plotId) {
  return state.towers.find((t) => t.plotId === plotId) || null;
}

export function towerById(state, id) {
  return state.towers.find((t) => t.id === id) || null;
}

// Furthest-along-the-road enemy inside range (deterministic: ties by id).
export function acquireTarget(tower, enemies, range) {
  let best = null;
  let bestDist = -1;
  for (const e of enemies) {
    const d = Math.hypot(e.x - tower.x, e.y - tower.y);
    if (d <= range && (e.dist > bestDist || (e.dist === bestDist && best && e.id < best.id))) {
      best = e;
      bestDist = e.dist;
    }
  }
  return best;
}

export function fireTower(state, tower, target, now) {
  const stats = towerStats(tower.kind, tower.level);
  tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
  tower.cooldown = 1 / stats.rate;
  if (tower.kind === 'prism') {
    // Instant chain light: hit the target and up to 2 nearest others.
    const near = state.enemies
      .filter((e) => e !== target && Math.hypot(e.x - target.x, e.y - target.y) <= 110)
      .sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y))
      .slice(0, stats.chain - 1);
    const hit = [target, ...near];
    for (const e of hit) damageEnemy(state, e, stats.damage, tower);
    state.fx.push({ kind: 'beam', x1: tower.x, y1: tower.y, x2: target.x, y2: target.y, ttl: 0.18, max: 0.18, color: stats.color });
    state.audio.shoot('prism');
    return;
  }
  state.projectiles.push({
    x: tower.x,
    y: tower.y - 14,
    targetId: target.id,
    tx: target.x,
    ty: target.y,
    speed: stats.projSpeed,
    damage: stats.damage,
    splash: stats.splash,
    slow: stats.slow,
    slowDur: stats.slowDur,
    kind: tower.kind,
    towerId: tower.id,
    color: stats.color,
  });
  state.audio.shoot(tower.kind);
}

export function damageEnemy(state, enemy, dmg, tower) {
  if (enemy.hp <= 0) return;
  enemy.hp -= dmg;
  enemy.flash = 0.12;
  if (enemy.hp <= 0) {
    state.kills += 1;
    state.gold += enemy.reward;
    state.score += 25;
    state.stats.earned += enemy.reward;
    if (tower) tower.kills += 1;
    state.fx.push({ kind: 'burst', x: enemy.x, y: enemy.y, ttl: 0.35, max: 0.35, color: enemy.color });
    state.audio.hit();
  }
}

export function updateProjectiles(state, dt) {
  const keep = [];
  for (const p of state.projectiles) {
    const target = state.enemies.find((e) => e.id === p.targetId);
    if (target) {
      p.tx = target.x;
      p.ty = target.y;
    }
    const dx = p.tx - p.x;
    const dy = p.ty - p.y;
    const d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (d <= Math.max(step, 10)) {
      // Impact.
      if (p.splash > 0) {
        const tower = state.towers.find((t) => t.id === p.towerId);
        for (const e of [...state.enemies]) {
          if (Math.hypot(e.x - p.tx, e.y - p.ty) <= p.splash) damageEnemy(state, e, p.damage, tower);
        }
        state.fx.push({ kind: 'ring', x: p.tx, y: p.ty, ttl: 0.3, max: 0.3, color: p.color, r: p.splash });
      } else if (target && target.hp > 0) {
        const tower = state.towers.find((t) => t.id === p.towerId);
        if (p.slow > 0) {
          target.slowUntil = state.time + p.slowDur;
          target.slowFactor = 1 - p.slow;
        }
        damageEnemy(state, target, p.damage, tower);
      }
      continue;
    }
    p.x += (dx / d) * step;
    p.y += (dy / d) * step;
    keep.push(p);
  }
  state.projectiles = keep;
}

export function updateEnemies(state, dt) {
  const keep = [];
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    const slowed = state.time < e.slowUntil;
    const speed = e.speed * (slowed ? e.slowFactor : 1);
    e.dist += speed * dt;
    e.flash = Math.max(0, e.flash - dt);
    if (e.dist >= TOTAL_PATH) {
      // Reached the ember.
      state.emberHp = Math.max(0, state.emberHp - e.leak);
      state.stats.leaks += 1;
      state.score = Math.max(0, state.score - 40);
      state.fx.push({ kind: 'leak', x: e.x, y: e.y, ttl: 0.5, max: 0.5, color: '#ff5c5c' });
      state.audio.leak();
      continue;
    }
    const pos = pointAt(e.dist);
    e.x = pos.x;
    e.y = pos.y;
    e.seg = pos.seg;
    keep.push(e);
  }
  state.enemies = keep;
}

// Emberlight Keep — canvas rendering. All art is drawn in code;
// no images, no external assets.

import { W, H, TOWERS, TOWER_ORDER, towerStats, upgradeCost, sellValue, EMBER_MAX } from './config.js';
import { PATH, PLOTS, EMBER } from './level.js';
import { panelRect, upgradePanelRect } from './game.js';

function hash(n) {
  let x = (n * 2654435761) >>> 0;
  x ^= x >>> 13;
  x = Math.imul(x, 0x5bd1e995);
  x ^= x >>> 15;
  return (x >>> 0) / 4294967296;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFlame(ctx, x, y, s, t, color) {
  ctx.save();
  ctx.translate(x, y);
  const flick = Math.sin(t * 0.006 + x) * 0.12 + Math.sin(t * 0.011) * 0.08;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -26 * s);
  ctx.bezierCurveTo(14 * s, -10 * s, 12 * s, 6 * s, 0, 12 * s);
  ctx.bezierCurveTo(-12 * s, 6 * s, -14 * s, -10 * s, 0, -26 * s);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.moveTo(0, -14 * s * (1 + flick));
  ctx.bezierCurveTo(7 * s, -4 * s, 6 * s, 6 * s, 0, 9 * s);
  ctx.bezierCurveTo(-6 * s, 6 * s, -7 * s, -4 * s, 0, -14 * s * (1 + flick));
  ctx.fill();
  ctx.restore();
}

export function render(ctx, game, now) {
  const s = game.state;
  const t = now || 0;
  ctx.clearRect(0, 0, W, H);

  // Night forest background.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0d1f2d');
  bg.addColorStop(0.55, '#12291f');
  bg.addColorStop(1, '#0a1a14');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Stars (deterministic positions).
  ctx.fillStyle = '#cfe8ff';
  for (let i = 0; i < 70; i += 1) {
    const x = hash(i * 3 + 1) * W;
    const y = hash(i * 3 + 2) * 190;
    const a = 0.25 + 0.55 * Math.abs(Math.sin(t * 0.001 + i));
    ctx.globalAlpha = a * 0.8;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;

  // Pine trees (fixed spots, kept off the road).
  const trees = [
    [60, 60], [140, 90], [420, 80], [640, 90], [760, 80], [1080, 60],
    [60, 300], [90, 480], [150, 620], [420, 640], [980, 640], [1150, 480],
    [1140, 640], [60, 620], [330, 120], [700, 180], [880, 90], [1080, 480],
  ];
  for (const [x, y] of trees) {
    ctx.fillStyle = '#123524';
    ctx.beginPath();
    ctx.moveTo(x, y - 34);
    ctx.lineTo(x - 18, y + 8);
    ctx.lineTo(x + 18, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0b2418';
    ctx.fillRect(x - 2, y + 8, 4, 10);
  }

  drawRoad(ctx);
  drawPlots(ctx, s, t);
  drawEmber(ctx, s, t);
  drawTowers(ctx, s, t);
  drawEnemies(ctx, s, t);
  drawProjectiles(ctx, s);
  drawFx(ctx, s);

  if (s.screen === 'title') drawTitle(ctx, s, t);
  else if (s.screen === 'victory') drawEnd(ctx, s, true);
  else if (s.screen === 'defeat') drawEnd(ctx, s, false);
  else {
    drawHud(ctx, s);
    drawPanels(ctx, s);
    if (s.paused) {
      ctx.fillStyle = 'rgba(4,10,16,0.6)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 54px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', W / 2, H / 2 - 10);
      ctx.font = '20px Georgia, serif';
      ctx.fillStyle = '#dfe9e2';
      ctx.fillText('Press P to resume the watch', W / 2, H / 2 + 30);
    }
  }
}

function drawRoad(ctx) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#3a2f22';
  ctx.lineWidth = 46;
  ctx.beginPath();
  ctx.moveTo(PATH[0].x, PATH[0].y);
  for (let i = 1; i < PATH.length; i += 1) ctx.lineTo(PATH[i].x, PATH[i].y);
  ctx.stroke();
  ctx.strokeStyle = '#6b5636';
  ctx.lineWidth = 38;
  ctx.stroke();
  ctx.strokeStyle = '#8a6f47';
  ctx.lineWidth = 2;
  ctx.setLineDash([14, 18]);
  ctx.beginPath();
  ctx.moveTo(PATH[0].x, PATH[0].y);
  for (let i = 1; i < PATH.length; i += 1) ctx.lineTo(PATH[i].x, PATH[i].y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPlots(ctx, s, t) {
  for (const plot of PLOTS) {
    const occupied = s.towers.some((tw) => tw.plotId === plot.id);
    const selected = s.selectedPlot === plot.id;
    ctx.save();
    ctx.translate(plot.x, plot.y);
    if (selected) {
      ctx.strokeStyle = '#ffe9a8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 34 + Math.sin(t * 0.005) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = occupied ? '#2c2620' : '#4a4238';
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a7a5f';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (!occupied) {
      ctx.fillStyle = '#c9b489';
      ctx.font = 'bold 13px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✦', 0, -1);
      ctx.fillStyle = '#ffe9a8';
      ctx.font = '11px Georgia, serif';
      ctx.fillText('★'.repeat(Math.max(1, Math.round(plot.value / 20))), 0, 16);
    }
    ctx.restore();
  }
}

function drawEmber(ctx, s, t) {
  const { x, y } = EMBER;
  const glow = ctx.createRadialGradient(x, y, 4, x, y, 90);
  const intensity = s.emberHp / EMBER_MAX;
  glow.addColorStop(0, `rgba(255,190,80,${0.35 + 0.45 * intensity})`);
  glow.addColorStop(1, 'rgba(255,190,80,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 90, y - 90, 180, 180);
  // Stone keep.
  ctx.fillStyle = '#5a5148';
  rr(ctx, x - 26, y - 18, 52, 44, 8);
  ctx.fill();
  ctx.fillStyle = '#3a332c';
  ctx.fillRect(x - 26, y - 18, 52, 10);
  ctx.fillStyle = '#7a6f60';
  ctx.fillRect(x - 20, y + 8, 40, 6);
  // The ember flame.
  drawFlame(ctx, x, y - 16, 1 + 0.15 * Math.sin(t * 0.004), t, '#ff9a2a');
  // Hearts.
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffb3b3';
  ctx.fillText(`♥ ${s.emberHp}/${EMBER_MAX}`, x, y + 52);
}

function drawTowers(ctx, s, t) {
  for (const tw of s.towers) {
    const stats = towerStats(tw.kind, tw.level);
    const selected = s.selectedTower === tw.id;
    ctx.save();
    ctx.translate(tw.x, tw.y);
    // Range ring when selected.
    if (selected) {
      ctx.strokeStyle = 'rgba(255,233,168,0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, stats.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // Base.
    ctx.fillStyle = '#4a4238';
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a7a5f';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.rotate(tw.angle + Math.PI / 2);
    ctx.fillStyle = stats.color;
    if (tw.kind === 'spark') {
      ctx.beginPath();
      ctx.moveTo(0, -26);
      ctx.lineTo(9, 6);
      ctx.lineTo(-9, 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(0, -4, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (tw.kind === 'frost') {
      ctx.beginPath();
      ctx.arc(0, -8, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#eafcff';
      ctx.beginPath();
      ctx.arc(0, -8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = stats.color;
      ctx.lineWidth = 3;
      for (let k = 0; k < 3; k += 1) {
        const a = (k * Math.PI * 2) / 3 + 0.5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 12, -8 + Math.sin(a) * 12);
        ctx.lineTo(Math.cos(a) * 20, -8 + Math.sin(a) * 20);
        ctx.stroke();
      }
    } else if (tw.kind === 'cannon') {
      ctx.fillRect(-7, -30, 14, 30);
      ctx.beginPath();
      ctx.arc(0, -28, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2c1c10';
      ctx.beginPath();
      ctx.arc(0, -30, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Prism: rotating crystal.
      ctx.rotate(Math.sin(t * 0.002 + tw.id) * 0.15);
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(11, 0);
      ctx.lineTo(0, 10);
      ctx.lineTo(-11, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(5, -2);
      ctx.lineTo(0, 4);
      ctx.lineTo(-5, -2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // Level pips.
    ctx.fillStyle = '#ffe9a8';
    for (let i = 0; i < tw.level; i += 1) {
      ctx.beginPath();
      ctx.arc(tw.x - 10 + i * 10, tw.y + 28, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawEnemies(ctx, s, t) {
  for (const e of s.enemies) {
    const slowed = t < 0 ? false : s.time < e.slowUntil;
    ctx.save();
    ctx.translate(e.x, e.y);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, e.radius * 0.8, e.radius, e.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    if (slowed) {
      ctx.strokeStyle = '#7fd4ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : e.color;
    const wob = Math.sin(t * 0.008 + e.id * 1.7) * 2;
    if (e.shape === 'blob') {
      ctx.beginPath();
      ctx.arc(0, wob * 0.4, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#241a3d';
      ctx.beginPath();
      ctx.arc(-4, -3, 2.5, 0, Math.PI * 2);
      ctx.arc(4, -3, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.shape === 'dart') {
      ctx.beginPath();
      ctx.moveTo(e.radius + 4, 0);
      ctx.lineTo(-e.radius, -e.radius * 0.8);
      ctx.lineTo(-e.radius * 0.4, 0);
      ctx.lineTo(-e.radius, e.radius * 0.8);
      ctx.closePath();
      ctx.fill();
    } else if (e.shape === 'brute') {
      rr(ctx, -e.radius, -e.radius + wob * 0.3, e.radius * 2, e.radius * 2, 6);
      ctx.fill();
      ctx.fillStyle = '#1d2f24';
      ctx.fillRect(-e.radius + 3, -6, e.radius * 2 - 6, 4);
      ctx.beginPath();
      ctx.arc(-5, -4, 2, 0, Math.PI * 2);
      ctx.arc(5, -4, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.shape === 'wisp') {
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(0, wob * 0.5, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fffbe0';
      ctx.beginPath();
      ctx.arc(0, wob * 0.5, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Gloomlord: crowned shadow.
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a5cff';
      ctx.beginPath();
      ctx.moveTo(-16, -e.radius + 4);
      ctx.lineTo(-10, -e.radius - 12);
      ctx.lineTo(-4, -e.radius + 2);
      ctx.lineTo(2, -e.radius - 12);
      ctx.lineTo(8, -e.radius + 2);
      ctx.lineTo(14, -e.radius - 10);
      ctx.lineTo(16, -e.radius + 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath();
      ctx.arc(-7, -2, 3, 0, Math.PI * 2);
      ctx.arc(7, -2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // HP bar.
    if (e.hp < e.maxHp) {
      const w = e.radius * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 10, w, 4);
      ctx.fillStyle = '#7dff8a';
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 10, w * Math.max(0, e.hp / e.maxHp), 4);
    }
  }
}

function drawProjectiles(ctx, s) {
  for (const p of s.projectiles) {
    ctx.save();
    if (p.kind === 'cannon') {
      ctx.fillStyle = '#ff7a4d';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd27f';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'frost') {
      ctx.fillStyle = '#7fd4ff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#ffb347';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawFx(ctx, s) {
  for (const f of s.fx) {
    const a = Math.max(0, f.ttl / f.max);
    if (f.kind === 'burst') {
      ctx.fillStyle = f.color;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 4 + (1 - a) * 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (f.kind === 'ring') {
      ctx.strokeStyle = f.color;
      ctx.globalAlpha = a;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (1 - a * 0.6), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (f.kind === 'beam') {
      ctx.strokeStyle = f.color;
      ctx.globalAlpha = a;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(f.x1, f.y1);
      ctx.lineTo(f.x2, f.y2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (f.kind === 'leak') {
      ctx.fillStyle = '#ff5c5c';
      ctx.globalAlpha = a;
      ctx.font = 'bold 18px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('−♥', f.x, f.y - (1 - a) * 24);
      ctx.globalAlpha = 1;
    }
  }
}

function drawHud(ctx, s) {
  ctx.fillStyle = 'rgba(6,14,20,0.82)';
  ctx.fillRect(0, 0, W, 52);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('🔥 Emberlight Keep', 16, 26);
  ctx.fillStyle = '#dfe9e2';
  ctx.font = '17px Georgia, serif';
  ctx.fillText(`Gold ${s.gold}g`, 260, 26);
  ctx.fillText(`Wave ${s.wave}/${10}`, 400, 26);
  ctx.fillText(`Score ${s.score}`, 520, 26);
  ctx.fillStyle = s.emberHp <= 5 ? '#ff8a8a' : '#ffb3b3';
  ctx.fillText(`♥ Ember ${s.emberHp}/${EMBER_MAX}`, 660, 26);
  ctx.fillText(`Kills ${s.kills}`, 850, 26);
  // Buttons.
  const btn = (x, label, active) => {
    ctx.fillStyle = active ? '#7a5a1e' : '#2c3a2e';
    rr(ctx, x, 8, 120, 36, 8);
    ctx.fill();
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + 60, 27);
  };
  // Call-wave button is 120 wide at x=980; speed/pause/mute are 40-wide squares.
  btn(980, s.phase === 'build' ? '▶ Call Wave' : '… Wave …', s.phase === 'build');
  const sq = (x, label) => {
    ctx.fillStyle = '#2c3a2e';
    rr(ctx, x, 8, 40, 36, 8);
    ctx.fill();
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + 20, 27);
  };
  sq(1110, s.speed === 2 ? '2×' : '1×');
  sq(1160, s.paused ? '▶' : '❚❚');
  sq(1210, s.muted ? '✕' : '♪');
  // Message line.
  ctx.fillStyle = 'rgba(6,14,20,0.75)';
  ctx.fillRect(0, H - 34, W, 34);
  ctx.fillStyle = '#dfe9e2';
  ctx.font = '15px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(s.message, 16, H - 17);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#9fb8a8';
  ctx.fillText('Click a plot to build (1–4) · Space: call wave · P pause · F speed · M mute · R restart', W - 16, H - 17);
}

function drawPanels(ctx, s) {
  if (s.selectedPlot) {
    const panel = panelRect(s.selectedPlot);
    if (!panel) return;
    ctx.fillStyle = 'rgba(6,14,20,0.92)';
    rr(ctx, panel.x, panel.y, panel.w, panel.h, 12);
    ctx.fill();
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 17px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Raise a tower  —  press 1–4 or click', panel.x + 16, panel.y + 22);
    TOWER_ORDER.forEach((key, i) => {
      const def = TOWERS[key];
      const cx = panel.x + 16 + i * 152;
      const cy = panel.y + 40;
      const afford = s.gold >= def.cost;
      ctx.fillStyle = afford ? '#2c3a2e' : '#3a2a2a';
      rr(ctx, cx, cy, 144, 84, 10);
      ctx.fill();
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = def.color;
      ctx.font = 'bold 14px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${i + 1} · ${def.name}`, cx + 72, cy + 18);
      ctx.fillStyle = '#dfe9e2';
      ctx.font = '12px Georgia, serif';
      ctx.fillText(`DMG ${def.damage} · ${def.rate.toFixed(1)}/s`, cx + 72, cy + 40);
      ctx.fillText(def.key === 'frost' ? 'Slows 45%' : def.key === 'cannon' ? 'Splash 55' : def.key === 'prism' ? 'Chains ×3' : 'Fast bolts', cx + 72, cy + 58);
      ctx.fillStyle = afford ? '#ffd27f' : '#ff8a8a';
      ctx.font = 'bold 14px Georgia, serif';
      ctx.fillText(`${def.cost}g`, cx + 72, cy + 76);
    });
  }
  if (s.selectedTower) {
    const tower = s.towers.find((tw) => tw.id === s.selectedTower);
    if (!tower) return;
    const panel = upgradePanelRect(tower);
    const def = TOWERS[tower.kind];
    const stats = towerStats(tower.kind, tower.level);
    ctx.fillStyle = 'rgba(6,14,20,0.92)';
    rr(ctx, panel.x, panel.y, panel.w, panel.h, 12);
    ctx.fill();
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 17px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${def.name} — Level ${tower.level} · ${tower.kills} kills · DMG ${stats.damage} · Range ${stats.range}`, panel.x + 16, panel.y + 22);
    const upCost = tower.level < 3 ? upgradeCost(tower.kind, tower.level) : null;
    ctx.fillStyle = upCost !== null && s.gold >= upCost ? '#2c3a2e' : '#3a2a2a';
    rr(ctx, panel.x + 16, panel.y + 40, 200, 84, 10);
    ctx.fill();
    ctx.strokeStyle = '#7dff8a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#dfe9e2';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(upCost === null ? 'MAX LEVEL' : `⬆ Upgrade — ${upCost}g`, panel.x + 116, panel.y + 82);
    ctx.fillStyle = '#7a3a2e';
    rr(ctx, panel.x + 232, panel.y + 40, 200, 84, 10);
    ctx.fill();
    ctx.strokeStyle = '#ff8a8a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffd7d7';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillText(`Sell — ${sellValue(tower)}g`, panel.x + 332, panel.y + 82);
  }
}

function drawTitle(ctx, s, t) {
  ctx.fillStyle = 'rgba(4,10,16,0.72)';
  ctx.fillRect(0, 0, W, H);
  drawFlame(ctx, W / 2 - 330, 380, 1.4, t, '#ff9a2a');
  drawFlame(ctx, W / 2 + 330, 380, 1.4, t + 400, '#ff9a2a');
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EMBERLIGHT KEEP', W / 2, 150);
  ctx.fillStyle = '#dfe9e2';
  ctx.font = '22px Georgia, serif';
  ctx.fillText('A tower defence of the last ember — hold the road through 10 waves of the Gloam.', W / 2, 205);
  ctx.font = '18px Georgia, serif';
  ctx.fillStyle = '#9fb8a8';
  ctx.fillText('Build on the old stones · Upgrade to level 3 · Call waves early for bonus gold', W / 2, 240);
  ctx.fillText('Spark Spire · Frost Lantern · Ember Cannon · Prism Obelisk', W / 2, 268);
  // Start button (click target: x 480–800, y 340–420).
  const pulse = 1 + Math.sin(t * 0.004) * 0.03;
  ctx.save();
  ctx.translate(W / 2, 380);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#7a5a1e';
  rr(ctx, -160, -40, 320, 80, 14);
  ctx.fill();
  ctx.strokeStyle = '#ffe9a8';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 28px Georgia, serif';
  ctx.fillText('BEGIN THE WATCH', 0, 2);
  ctx.restore();
  ctx.fillStyle = '#9fb8a8';
  ctx.font = '16px Georgia, serif';
  ctx.fillText('Mouse + keyboard · Space calls the next wave · P pause · F fast-forward · M mute · R restart', W / 2, 470);
  ctx.fillText('Original art and sound, drawn and synthesised in code. No downloads, no accounts.', W / 2, 500);
}

function drawEnd(ctx, s, win) {
  ctx.fillStyle = win ? 'rgba(10,26,14,0.78)' : 'rgba(26,8,10,0.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = win ? '#ffe9a8' : '#ff9a9a';
  ctx.font = 'bold 58px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(win ? 'THE EMBER ENDURES' : 'THE EMBER HAS GONE OUT', W / 2, 200);
  ctx.fillStyle = '#dfe9e2';
  ctx.font = '22px Georgia, serif';
  ctx.fillText(
    win
      ? `All 10 waves broken. ${s.kills} of the Gloam slain, ${s.emberHp}/${EMBER_MAX} hearts still burning.`
      : `The Gloam overran the keep on wave ${s.wave}. ${s.kills} slain before the dark.`,
    W / 2, 260,
  );
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 30px Georgia, serif';
  ctx.fillText(`Score ${s.score}   ·   Kills ${s.kills}   ·   Gold earned ${s.stats.earned}g`, W / 2, 320);
  ctx.fillStyle = '#9fb8a8';
  ctx.font = '18px Georgia, serif';
  ctx.fillText(win ? 'The keep stands. Light the watch again whenever you like.' : 'Raise stronger towers and try the watch again.', W / 2, 360);
  ctx.fillStyle = '#7a5a1e';
  rr(ctx, 480, 430, 320, 70, 14);
  ctx.fill();
  ctx.strokeStyle = '#ffe9a8';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 26px Georgia, serif';
  ctx.fillText('PLAY AGAIN  (R)', W / 2, 466);
}

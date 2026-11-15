// Everything the player sees: the night field, the path, the towers, the Gloam,
// the HUD and every menu. The renderer never changes the rules; it only paints
// the state game.js hands it, in the fixed 1280x720 logical field scaled to the
// window. It also owns the clickable rectangles (uiHit), so a click lands where
// the player sees the button.
import { EMBER, FIELD, FONT, MAX_LEVEL, PALETTE, TOWERS, TOWER_ORDER, WAVE_COUNT } from './config.js';
import { PATH, PLOTS } from './level.js';
import { sellValue, towerStats, upgradeCost } from './towers.js';
import { SCREEN_DEFEAT, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './game.js';

const HUD_H = 54;

/** Deterministic specks from an index (no per-frame randomness). */
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panelRectFor(plot) {
  const w = 620;
  const h = 138;
  const x = Math.max(8, Math.min(FIELD.width - w - 8, plot.x - w / 2));
  const y = plot.y > 380
    ? Math.max(HUD_H + 8, plot.y - h - 78)
    : Math.min(FIELD.height - h - 8, plot.y + 78);
  return { x, y, w, h };
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function fit(input) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    offsetX = (canvas.width - FIELD.width * scale) / 2;
    offsetY = (canvas.height - FIELD.height * scale) / 2;
    if (input) input.setTransform(scale / dpr, offsetX / dpr, offsetY / dpr);
  }

  function drawBackground(state) {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, PALETTE.skyTop);
    g.addColorStop(0.55, PALETTE.skyBottom);
    g.addColorStop(0.551, PALETTE.ground);
    g.addColorStop(1, PALETTE.groundDark);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    // Stars and a moon, fixed by index so the sky never shimmers.
    ctx.fillStyle = '#e8ecff';
    for (let i = 0; i < 90; i += 1) {
      const x = hash(i) * FIELD.width;
      const y = hash(i + 500) * 300;
      const r = 0.6 + hash(i + 900) * 1.4;
      ctx.globalAlpha = 0.35 + hash(i + 1300) * 0.55;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f5edd0';
    ctx.beginPath();
    ctx.arc(1120, 105, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.skyTop;
    ctx.beginPath();
    ctx.arc(1108, 97, 26, 0, Math.PI * 2);
    ctx.fill();

    // Distant pines along the top.
    ctx.fillStyle = '#141d1a';
    for (let x = 0; x < FIELD.width; x += 46) {
      const h = 26 + hash(x) * 26;
      ctx.beginPath();
      ctx.moveTo(x, 396);
      ctx.lineTo(x + 14, 396 - h);
      ctx.lineTo(x + 28, 396);
      ctx.closePath();
      ctx.fill();
    }

    // Grass tufts.
    ctx.strokeStyle = '#2c4a34';
    ctx.lineWidth = 2;
    for (let i = 0; i < 160; i += 1) {
      const x = hash(i + 2000) * FIELD.width;
      const y = 410 + hash(i + 2600) * 300;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 3, y - 7);
      ctx.moveTo(x + 5, y);
      ctx.lineTo(x + 8, y - 6);
      ctx.stroke();
    }
  }

  function drawPath() {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = PALETTE.pathEdge;
    ctx.lineWidth = 68;
    ctx.beginPath();
    PATH.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.strokeStyle = PALETTE.path;
    ctx.lineWidth = 58;
    ctx.stroke();
    // Cobbles, fixed along the path.
    ctx.fillStyle = PALETTE.pathStone;
    for (let d = 20; d < 2400; d += 46) {
      const t = d / 2400;
      const i = Math.min(PATH.length - 2, Math.floor(t * (PATH.length - 1)));
      const a = PATH[i];
      const b = PATH[i + 1];
      const local = (t * (PATH.length - 1)) - i;
      const x = a.x + (b.x - a.x) * local + (hash(d) - 0.5) * 36;
      const y = a.y + (b.y - a.y) * local + (hash(d + 7) - 0.5) * 36;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.ellipse(x, y, 9, 6, hash(d + 13) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawPlots(state) {
    for (const plot of PLOTS) {
      const taken = state.towers.some((t) => t.plotId === plot.id);
      const hovered = state.hoverPlot === plot.id || state.selectedPlot === plot.id;
      ctx.beginPath();
      ctx.arc(plot.x, plot.y, 30, 0, Math.PI * 2);
      ctx.fillStyle = hovered ? PALETTE.plotHover : PALETTE.plot;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = state.selectedPlot === plot.id ? PALETTE.gold : PALETTE.plotEdge;
      ctx.stroke();
      if (!taken) {
        ctx.strokeStyle = '#5f7a9e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(plot.x - 8, plot.y);
        ctx.lineTo(plot.x + 8, plot.y);
        ctx.moveTo(plot.x, plot.y - 8);
        ctx.lineTo(plot.x, plot.y + 8);
        ctx.stroke();
      }
    }
  }

  function drawEmber(state) {
    const flicker = 1 + Math.sin(state.time * 7) * 0.08 + Math.sin(state.time * 13) * 0.05;
    const glow = ctx.createRadialGradient(EMBER.x, EMBER.y, 4, EMBER.x, EMBER.y, 110 * flicker);
    glow.addColorStop(0, 'rgba(255,179,71,0.55)');
    glow.addColorStop(1, 'rgba(255,179,71,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(EMBER.x - 120, EMBER.y - 120, 240, 240);

    // Stone keep.
    ctx.fillStyle = '#3a4152';
    roundRect(ctx, EMBER.x - 26, EMBER.y - 8, 52, 66, 6);
    ctx.fill();
    ctx.fillStyle = '#2b3242';
    roundRect(ctx, EMBER.x - 32, EMBER.y - 16, 64, 16, 5);
    ctx.fill();
    // The lantern and its flame.
    ctx.fillStyle = '#1c2230';
    roundRect(ctx, EMBER.x - 16, EMBER.y - 52, 32, 40, 6);
    ctx.fill();
    ctx.fillStyle = PALETTE.emberCore;
    ctx.beginPath();
    ctx.ellipse(EMBER.x, EMBER.y - 32, 8 * flicker, 13 * flicker, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.ember;
    ctx.beginPath();
    ctx.ellipse(EMBER.x, EMBER.y - 30, 4.5 * flicker, 8 * flicker, 0, 0, Math.PI * 2);
    ctx.fill();
    // Health ring.
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#20263a';
    ctx.beginPath();
    ctx.arc(EMBER.x, EMBER.y - 32, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = state.emberHp <= 5 ? PALETTE.danger : PALETTE.ember;
    ctx.beginPath();
    ctx.arc(EMBER.x, EMBER.y - 32, 30, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * state.emberHp) / EMBER.hp);
    ctx.stroke();
  }

  function drawTower(tower, state) {
    const def = TOWERS[tower.kind];
    // Base.
    ctx.fillStyle = '#39445a';
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#4a5468';
    ctx.stroke();
    const flash = tower.flash > 0 ? tower.flash : 0;
    if (tower.kind === 'spark') {
      ctx.save();
      ctx.translate(tower.x, tower.y - 10);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = flash > 0 ? '#fff3c4' : def.color;
      ctx.fillRect(-11, -11, 22, 22);
      ctx.restore();
    } else if (tower.kind === 'frost') {
      ctx.fillStyle = flash > 0 ? '#e6f7ff' : def.color;
      ctx.beginPath();
      ctx.arc(tower.x, tower.y - 10, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i += 1) {
        const a = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(tower.x - Math.cos(a) * 9, tower.y - 10 - Math.sin(a) * 9);
        ctx.lineTo(tower.x + Math.cos(a) * 9, tower.y - 10 + Math.sin(a) * 9);
        ctx.stroke();
      }
    } else if (tower.kind === 'cannon') {
      ctx.save();
      ctx.translate(tower.x, tower.y - 8);
      ctx.rotate(tower.angle);
      ctx.fillStyle = '#2b3242';
      roundRect(ctx, -6, -7, 30, 14, 5);
      ctx.fill();
      ctx.fillStyle = flash > 0 ? '#ffd9a0' : def.color;
      ctx.beginPath();
      ctx.arc(24, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = def.dark;
      ctx.beginPath();
      ctx.arc(tower.x, tower.y - 8, 10, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.save();
      ctx.translate(tower.x, tower.y - 8);
      ctx.rotate(Math.sin(state.time * 1.5) * 0.12);
      ctx.fillStyle = flash > 0 ? '#f3e8ff' : def.color;
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.lineTo(12, 6);
      ctx.lineTo(-12, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tower.x, tower.y - 8, 19, state.time * 0.8, state.time * 0.8 + Math.PI * 1.2);
      ctx.stroke();
    }
    // Level pips.
    for (let i = 0; i < MAX_LEVEL; i += 1) {
      ctx.fillStyle = i < tower.level ? PALETTE.gold : '#4a5468';
      ctx.beginPath();
      ctx.arc(tower.x - 12 + i * 12, tower.y + 20, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEnemy(enemy, state) {
    const hpFrac = enemy.hp / enemy.maxHp;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    if (enemy.kind === 'wisp') {
      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
      glow.addColorStop(0, enemy.color);
      glow.addColorStop(1, 'rgba(154,167,255,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8ecff';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.kind === 'crawler') {
      ctx.fillStyle = enemy.dark;
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 + state.time * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 14, Math.sin(a) * 10, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#12210f';
      ctx.beginPath();
      ctx.arc(6, -3, 2, 0, Math.PI * 2);
      ctx.arc(10, -3, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.kind === 'flutter') {
      const flap = Math.sin(state.time * 14 + enemy.wobble) * 0.5;
      ctx.fillStyle = 'rgba(255,179,217,0.75)';
      ctx.save();
      ctx.rotate(-0.5 - flap);
      ctx.beginPath();
      ctx.ellipse(-8, -8, 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.rotate(0.5 + flap);
      ctx.beginPath();
      ctx.ellipse(8, -8, 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.kind === 'brute') {
      ctx.fillStyle = enemy.dark;
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 14, Math.sin(a) * 14);
        ctx.lineTo(Math.cos(a) * 24, Math.sin(a) * 24);
        ctx.lineTo(Math.cos(a + 0.35) * 14, Math.sin(a + 0.35) * 14);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(-5, -4, 3, 0, Math.PI * 2);
      ctx.arc(6, -4, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 52);
      glow.addColorStop(0, 'rgba(232,121,249,0.5)');
      glow.addColorStop(1, 'rgba(232,121,249,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.moveTo(-14, -22);
      ctx.lineTo(-7, -34);
      ctx.lineTo(0, -24);
      ctx.lineTo(7, -34);
      ctx.lineTo(14, -22);
      ctx.lineTo(0, -27);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2b0a33';
      ctx.beginPath();
      ctx.arc(-8, -2, 3.5, 0, Math.PI * 2);
      ctx.arc(8, -2, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (hpFrac < 1) {
      ctx.fillStyle = '#20263a';
      ctx.fillRect(enemy.x - 16, enemy.y - enemy.radius - 12, 32, 5);
      ctx.fillStyle = hpFrac > 0.5 ? PALETTE.ok : PALETTE.danger;
      ctx.fillRect(enemy.x - 16, enemy.y - enemy.radius - 12, 32 * hpFrac, 5);
    }
  }

  function drawProjectiles(state) {
    for (const shell of state.projectiles) {
      ctx.fillStyle = '#ffb347';
      ctx.beginPath();
      ctx.arc(shell.x, shell.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(shell.x, shell.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawParticles(particles) {
    for (const beam of particles.beams) {
      ctx.globalAlpha = Math.max(0, beam.life / 0.16);
      ctx.strokeStyle = beam.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(beam.x1, beam.y1);
      ctx.lineTo(beam.x2, beam.y2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const p of particles.sparks) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      if (p.ring) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - p.life / p.max) + 6, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'center';
    for (const f of particles.floats) {
      ctx.globalAlpha = Math.min(1, f.life);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawRange(state) {
    const tower = state.towers.find((t) => t.id === state.selectedTower);
    if (tower) {
      ctx.fillStyle = 'rgba(255,209,102,0.08)';
      ctx.strokeStyle = 'rgba(255,209,102,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      return;
    }
    if (state.selectedPlot !== null && state.hoverKind) {
      const plot = PLOTS[state.selectedPlot];
      const stats = towerStats(state.hoverKind, 1);
      ctx.fillStyle = 'rgba(255,209,102,0.08)';
      ctx.strokeStyle = 'rgba(255,209,102,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(plot.x, plot.y, stats.range, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  function button(ctx2, rect, label, enabled = true) {
    ctx2.fillStyle = enabled ? PALETTE.button : '#232a3a';
    roundRect(ctx2, rect.x, rect.y, rect.w, rect.h, 8);
    ctx2.fill();
    ctx2.lineWidth = 2;
    ctx2.strokeStyle = PALETTE.buttonEdge;
    ctx2.stroke();
    ctx2.fillStyle = enabled ? PALETTE.text : PALETTE.muted;
    ctx2.font = `bold 16px ${FONT}`;
    ctx2.textAlign = 'center';
    ctx2.textBaseline = 'middle';
    ctx2.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
    ctx2.textBaseline = 'alphabetic';
  }

  function drawHud(state, best) {
    ctx.fillStyle = 'rgba(16,20,34,0.92)';
    ctx.fillRect(0, 0, FIELD.width, HUD_H);
    ctx.fillStyle = PALETTE.panelEdge;
    ctx.fillRect(0, HUD_H, FIELD.width, 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText(`⬢ ${state.gold}`, 18, HUD_H / 2 + 1);
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(`Wave ${Math.max(1, state.wave)} / ${WAVE_COUNT}`, 150, HUD_H / 2 + 1);
    // Ember hearts.
    for (let i = 0; i < EMBER.hp; i += 1) {
      ctx.fillStyle = i < state.emberHp ? PALETTE.heart : '#3a4152';
      const x = 300 + i * 15;
      ctx.beginPath();
      ctx.arc(x, HUD_H / 2 - 2, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = `16px ${FONT}`;
    ctx.fillText(`Score ${state.score}   Kills ${state.kills}   Best ${Math.max(best, state.score)}`, 620, HUD_H / 2 + 1);
    button(ctx, { x: 1060, y: 10, w: 58, h: 34 }, state.speed === 1 ? '1×' : '2×');
    button(ctx, { x: 1126, y: 10, w: 58, h: 34 }, 'II');
    button(ctx, { x: 1192, y: 10, w: 58, h: 34 }, '♪');
    ctx.textBaseline = 'alphabetic';
    if (state.phase === 'build' && state.screen === SCREEN_PLAY) {
      const label = state.wave === 0
        ? `Start wave 1  (Space) — ${Math.ceil(state.buildTime)}s`
        : `Call wave ${state.wave + 1} early +${25}  (Space) — ${Math.ceil(state.buildTime)}s`;
      ctx.font = `bold 17px ${FONT}`;
      const w = ctx.measureText(label).width + 36;
      button(ctx, { x: FIELD.width / 2 - w / 2, y: FIELD.height - 52, w, h: 38 }, label);
    }
  }

  function drawBuildPanel(state) {
    const plot = PLOTS[state.selectedPlot];
    if (!plot) return;
    const tower = state.towers.find((t) => t.plotId === plot.id);
    const rect = panelRectFor(plot);
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 17px ${FONT}`;
    if (!tower) {
      ctx.fillText('Build a tower here — click a card, or press 1–4', rect.x + 16, rect.y + 26);
      const cardW = (rect.w - 32 - 3 * 10) / 4;
      TOWER_ORDER.forEach((kind, i) => {
        const def = TOWERS[kind];
        const card = { x: rect.x + 16 + i * (cardW + 10), y: rect.y + 40, w: cardW, h: 84 };
        const afford = state.gold >= def.cost;
        ctx.fillStyle = afford ? PALETTE.button : '#232a3a';
        roundRect(ctx, card.x, card.y, card.w, card.h, 8);
        ctx.fill();
        ctx.strokeStyle = state.hoverKind === kind ? PALETTE.gold : PALETTE.buttonEdge;
        ctx.lineWidth = state.hoverKind === kind ? 3 : 1.5;
        ctx.stroke();
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.arc(card.x + 18, card.y + 18, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = afford ? PALETTE.text : PALETTE.muted;
        ctx.font = `bold 14px ${FONT}`;
        ctx.fillText(`${def.short}  [${def.key}]`, card.x + 32, card.y + 22);
        ctx.fillStyle = PALETTE.gold;
        ctx.font = `13px ${FONT}`;
        ctx.fillText(`⬢ ${def.cost}`, card.x + 10, card.y + 44);
        ctx.fillStyle = PALETTE.muted;
        ctx.font = `12px ${FONT}`;
        ctx.fillText(`dmg ${def.damage} · ${def.rate}/s`, card.x + 10, card.y + 62);
        ctx.fillText(`range ${def.range}`, card.x + 10, card.y + 78);
      });
    } else {
      const def = TOWERS[tower.kind];
      ctx.fillText(`${def.name} — level ${tower.level} / ${MAX_LEVEL}`, rect.x + 16, rect.y + 26);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `14px ${FONT}`;
      ctx.fillText(`Damage ${tower.damage} · ${tower.rate} shots/s · range ${tower.range} · ${def.blurb}`, rect.x + 16, rect.y + 52);
      const upCost = upgradeCost(tower);
      const sell = sellValue(tower);
      button(ctx, { x: rect.x + 16, y: rect.y + 72, w: 250, h: 44 }, upCost > 0 ? `Upgrade — ⬢ ${upCost}` : 'Fully upgraded', upCost > 0 && state.gold >= upCost);
      button(ctx, { x: rect.x + 282, y: rect.y + 72, w: 180, h: 44 }, `Sell — ⬢ ${sell}`);
      button(ctx, { x: rect.x + 478, y: rect.y + 72, w: 126, h: 44 }, 'Close');
    }
  }

  function drawBanner(state) {
    if (!state.banner) return;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(16,20,34,0.72)';
    const w = 560;
    roundRect(ctx, FIELD.width / 2 - w / 2, 78, w, state.banner.sub ? 74 : 52, 12);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 26px ${FONT}`;
    ctx.fillText(state.banner.text, FIELD.width / 2, 108);
    if (state.banner.sub) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `15px ${FONT}`;
      ctx.fillText(state.banner.sub, FIELD.width / 2, 134);
    }
    ctx.textAlign = 'left';
  }

  function overlay(title, lines, foot, accent) {
    ctx.fillStyle = 'rgba(10,13,26,0.78)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const w = 680;
    const h = 150 + lines.length * 30 + 74;
    const x = FIELD.width / 2 - w / 2;
    const y = FIELD.height / 2 - h / 2;
    ctx.fillStyle = PALETTE.panelSolid;
    roundRect(ctx, x, y, w, h, 16);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = accent;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = `bold 40px ${FONT}`;
    ctx.fillText(title, FIELD.width / 2, y + 62);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `17px ${FONT}`;
    lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, y + 108 + i * 30));
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `15px ${FONT}`;
    ctx.fillText(foot, FIELD.width / 2, y + h - 24);
    ctx.textAlign = 'left';
  }

  function drawTitle(state, best) {
    overlay('EMBERLIGHT KEEP', [
      'The last ember burns at the end of the road. The Gloam is coming.',
      'Build towers on the stone plots. Stop every creature for 10 waves.',
      'Click a plot to build · 1–4 pick a tower · Space calls the next wave',
      'P pauses · F speeds up · M mutes · R restarts after the end',
      best > 0 ? `Best score so far: ${best}` : 'No keeper has held the light yet — be the first.',
    ], 'Click anywhere or press Space to begin', PALETTE.ember);
  }

  function drawPaused() {
    overlay('PAUSED', ['The Gloam waits. The ember still burns.'], 'P or Esc to keep playing', PALETTE.muted);
  }

  function drawVictory(state) {
    overlay('THE LIGHT HOLDS', [
      `All ${WAVE_COUNT} waves broken against your towers.`,
      `Score ${state.score} · ${state.kills} creatures stopped · ${state.stats.built} towers raised`,
      `${state.emberHp} of ${EMBER.hp} ember hearts still burning — bonus earned.`,
    ], 'Press R or click to play again', PALETTE.ok);
  }

  function drawDefeat(state) {
    overlay('THE EMBER DIES', [
      `The Gloam reached the lantern on wave ${Math.max(1, state.wave)}.`,
      `Score ${state.score} · ${state.kills} creatures stopped · ${state.stats.leaks} slipped through`,
      'Build closer to the bends, mix Frost with Cannon, and call waves early for gold.',
    ], 'Press R or click to try again', PALETTE.danger);
  }

  function draw(state, screen, best, particles) {
    fit();
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    ctx.save();
    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake * 18, (Math.random() - 0.5) * state.shake * 18);
    }
    drawBackground(state);
    drawPath();
    drawPlots(state);
    drawEmber(state);
    drawRange(state);
    for (const tower of state.towers) drawTower(tower, state);
    for (const enemy of state.enemies) drawEnemy(enemy, state);
    drawProjectiles(state);
    drawParticles(particles);
    ctx.restore();
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
      drawHud(state, best);
      if (state.selectedPlot !== null) drawBuildPanel(state);
      drawBanner(state);
    }
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_VICTORY) drawVictory(state);
    else if (screen === SCREEN_DEFEAT) drawDefeat(state);
  }

  /** What a click at logical (x, y) hits: a HUD button, a panel card, or null. */
  function uiHit(state, x, y) {
    if (state.screen === SCREEN_PLAY || state.screen === SCREEN_PAUSED) {
      if (y >= 10 && y <= 44) {
        if (x >= 1060 && x <= 1118) return { action: 'speed' };
        if (x >= 1126 && x <= 1184) return { action: 'pause' };
        if (x >= 1192 && x <= 1250) return { action: 'mute' };
      }
      if (state.phase === 'build' && state.screen === SCREEN_PLAY) {
        const label = state.wave === 0
          ? `Start wave 1  (Space) — ${Math.ceil(state.buildTime)}s`
          : `Call wave ${state.wave + 1} early +${25}  (Space) — ${Math.ceil(state.buildTime)}s`;
        ctx.font = `bold 17px ${FONT}`;
        const w = ctx.measureText(label).width + 36;
        if (x >= FIELD.width / 2 - w / 2 && x <= FIELD.width / 2 + w / 2 && y >= FIELD.height - 52 && y <= FIELD.height - 14) {
          return { action: 'call' };
        }
      }
      if (state.selectedPlot !== null) {
        const plot = PLOTS[state.selectedPlot];
        const rect = panelRectFor(plot);
        const tower = state.towers.find((t) => t.plotId === plot.id);
        if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
          if (!tower) {
            const cardW = (rect.w - 32 - 3 * 10) / 4;
            for (let i = 0; i < 4; i += 1) {
              const card = { x: rect.x + 16 + i * (cardW + 10), y: rect.y + 40, w: cardW, h: 84 };
              if (x >= card.x && x <= card.x + card.w && y >= card.y && y <= card.y + card.h) {
                return { action: 'build', kind: TOWER_ORDER[i] };
              }
            }
          } else {
            if (x >= rect.x + 16 && x <= rect.x + 266 && y >= rect.y + 72 && y <= rect.y + 116) return { action: 'upgrade' };
            if (x >= rect.x + 282 && x <= rect.x + 462 && y >= rect.y + 72 && y <= rect.y + 116) return { action: 'sell' };
            if (x >= rect.x + 478 && x <= rect.x + 604 && y >= rect.y + 72 && y <= rect.y + 116) return { action: 'close' };
          }
          return { action: 'panel' };
        }
      }
    }
    return null;
  }

  return { draw, uiHit, fit, panelRectFor };
}

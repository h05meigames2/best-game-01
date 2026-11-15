// Sparks, smoke and floating numbers: short-lived decoration with no effect on
// the rules. Kept in fixed pools so a long game never grows them without bound.
export function createParticles() {
  const sparks = [];
  const floats = [];
  const beams = [];
  return {
    sparks, floats, beams,
    burst(x, y, color, count, speed) {
      for (let i = 0; i < count; i += 1) {
        if (sparks.length > 240) return;
        const angle = Math.random() * Math.PI * 2;
        const v = speed * (0.4 + Math.random() * 0.8);
        sparks.push({ x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, life: 0.5 + Math.random() * 0.4, max: 0.9, color, size: 2 + Math.random() * 3 });
      }
    },
    ring(x, y, color, radius) {
      if (sparks.length > 240) return;
      sparks.push({ x, y, vx: 0, vy: 0, life: 0.35, max: 0.35, color, size: radius, ring: true });
    },
    float(x, y, text, color) {
      if (floats.length > 40) floats.shift();
      floats.push({ x, y, text, color, life: 1.1 });
    },
    beam(x1, y1, x2, y2, color) {
      if (beams.length > 24) beams.shift();
      beams.push({ x1, y1, x2, y2, color, life: 0.16 });
    },
    step(dt) {
      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const p = sparks[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.92;
        p.vy *= 0.92;
        if (p.life <= 0) sparks.splice(i, 1);
      }
      for (let i = floats.length - 1; i >= 0; i -= 1) {
        const f = floats[i];
        f.life -= dt;
        f.y -= 34 * dt;
        if (f.life <= 0) floats.splice(i, 1);
      }
      for (let i = beams.length - 1; i >= 0; i -= 1) {
        beams[i].life -= dt;
        if (beams[i].life <= 0) beams.splice(i, 1);
      }
    },
    clear() {
      sparks.length = 0;
      floats.length = 0;
      beams.length = 0;
    },
  };
}

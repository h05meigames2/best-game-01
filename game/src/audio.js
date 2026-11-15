// Emberlight Keep — synthesised sound. Every sound is a WebAudio
// oscillator envelope; no audio files, no network.

export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (muted) return null;
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    } catch {
      return null;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    const c = ensure();
    if (!c) return;
    try {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, c.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), c.currentTime + dur);
      gain.gain.setValueAtTime(vol || 0.12, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + dur + 0.02);
    } catch {
      // Sound is decoration; never break the game.
    }
  }

  return {
    setMuted(m) {
      muted = !!m;
    },
    get muted() {
      return muted;
    },
    click() {
      tone(660, 0.06, 'sine', 0.08);
    },
    build() {
      tone(392, 0.12, 'triangle', 0.14);
      setTimeout(() => tone(523, 0.14, 'triangle', 0.14), 70);
    },
    upgrade() {
      tone(523, 0.1, 'triangle', 0.14);
      setTimeout(() => tone(659, 0.1, 'triangle', 0.14), 60);
      setTimeout(() => tone(784, 0.16, 'triangle', 0.14), 120);
    },
    sell() {
      tone(520, 0.1, 'sine', 0.1, 300);
    },
    error() {
      tone(160, 0.15, 'square', 0.07);
    },
    shoot(kind) {
      if (kind === 'cannon') tone(140, 0.16, 'sawtooth', 0.1, 60);
      else if (kind === 'frost') tone(880, 0.12, 'sine', 0.06, 1200);
      else if (kind === 'prism') tone(1200, 0.06, 'sine', 0.05, 900);
      else tone(740, 0.05, 'square', 0.04);
    },
    hit() {
      tone(220, 0.05, 'triangle', 0.05, 140);
    },
    leak() {
      tone(110, 0.35, 'sawtooth', 0.14, 55);
    },
    waveStart() {
      tone(220, 0.25, 'sawtooth', 0.1, 330);
      setTimeout(() => tone(330, 0.3, 'sawtooth', 0.1, 440), 120);
    },
    waveClear() {
      tone(523, 0.12, 'triangle', 0.12);
      setTimeout(() => tone(784, 0.2, 'triangle', 0.12), 100);
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.13), i * 130));
    },
    lose() {
      [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.35, 'sawtooth', 0.1), i * 160));
    },
  };
}

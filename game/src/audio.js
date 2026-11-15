// All sound is synthesised with WebAudio: short oscillator blips, no audio files,
// no network. Created lazily on the first user gesture; every call is safe before
// that (it simply does nothing until the context exists).
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume().catch(() => {});
      return true;
    }
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.32;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  /** One short tone: frequency slides from `from` to `to` over `seconds`. */
  function tone(from, to, seconds, type, volume, delay = 0) {
    if (muted || !ensure()) return;
    const start = context.currentTime + delay;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + seconds);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + seconds + 0.02);
  }

  return {
    unlock() { ensure(); },
    setMuted(value) { muted = value; },
    isMuted() { return muted; },
    click() { tone(660, 520, 0.06, 'triangle', 0.25); },
    place() { tone(220, 440, 0.12, 'triangle', 0.35); tone(440, 660, 0.1, 'sine', 0.2, 0.05); },
    upgrade() { tone(330, 660, 0.12, 'triangle', 0.3); tone(660, 990, 0.12, 'sine', 0.22, 0.08); },
    sell() { tone(520, 260, 0.1, 'triangle', 0.25); },
    shoot(kind) {
      if (kind === 'bolt') tone(880, 620, 0.05, 'square', 0.07);
      else if (kind === 'chill') tone(1180, 900, 0.09, 'sine', 0.09);
      else if (kind === 'shell') tone(180, 90, 0.14, 'triangle', 0.16);
      else tone(1400, 700, 0.08, 'sawtooth', 0.06);
    },
    hit() { tone(300, 180, 0.05, 'triangle', 0.08); },
    coin() { tone(990, 1320, 0.07, 'sine', 0.12); },
    leak() { tone(220, 110, 0.3, 'sawtooth', 0.22); },
    horn() { tone(196, 196, 0.28, 'triangle', 0.3); tone(294, 294, 0.28, 'triangle', 0.22, 0.02); },
    waveClear() { tone(523, 523, 0.1, 'triangle', 0.25); tone(659, 659, 0.1, 'triangle', 0.25, 0.09); tone(784, 784, 0.16, 'triangle', 0.25, 0.18); },
    win() {
      [523, 659, 784, 1047].forEach((note, i) => tone(note, note, 0.22, 'triangle', 0.28, i * 0.14));
      tone(1319, 1319, 0.4, 'sine', 0.2, 0.6);
    },
    lose() {
      [392, 330, 262, 196].forEach((note, i) => tone(note, note * 0.94, 0.3, 'triangle', 0.25, i * 0.18));
    },
  };
}

// Midnight Heist: all sound is synthesized with WebAudio, no audio files.
// One job: short blips for game events, created lazily on first user input.

export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function blip(freq, seconds, type, gainValue, slideTo) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + seconds);
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + seconds + 0.02);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    click() {
      blip(660, 0.06, 'square', 0.05);
    },
    pickup() {
      blip(880, 0.09, 'sine', 0.08, 1320);
    },
    tumbler() {
      blip(520, 0.07, 'triangle', 0.07, 780);
    },
    vault() {
      blip(220, 0.35, 'sawtooth', 0.06, 660);
    },
    noise() {
      blip(180, 0.12, 'sawtooth', 0.05, 90);
    },
    alarm() {
      blip(740, 0.16, 'square', 0.06, 520);
      setTimeout(() => blip(740, 0.16, 'square', 0.06, 520), 180);
    },
    jam() {
      blip(1200, 0.1, 'sine', 0.05, 300);
    },
    escaped() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'triangle', 0.08), i * 110));
    },
    busted() {
      [392, 311, 233].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'sawtooth', 0.07), i * 150));
    },
  };
}

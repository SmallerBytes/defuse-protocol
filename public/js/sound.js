/**
 * Sound engine — everything synthesized with WebAudio, no asset files.
 */
let ctx = null;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ freq = 440, dur = 0.1, type = 'square', gain = 0.08, when = 0, slide = 0 }) {
  const a = ac();
  const t0 = a.currentTime + when;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, t0 + dur);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.4, gain = 0.2, when = 0 }) {
  const a = ac();
  const t0 = a.currentTime + when;
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const g = a.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(g).connect(a.destination);
  src.start(t0);
}

export const sound = {
  unlock() { ac(); },
  click() { tone({ freq: 900, dur: 0.04, gain: 0.05 }); },
  tick() { tone({ freq: 1200, dur: 0.03, type: 'sine', gain: 0.04 }); },
  tickLow() { tone({ freq: 700, dur: 0.05, type: 'sine', gain: 0.07 }); },
  solve() {
    tone({ freq: 660, dur: 0.1, type: 'sine', gain: 0.1 });
    tone({ freq: 880, dur: 0.18, type: 'sine', gain: 0.1, when: 0.1 });
  },
  strike() {
    tone({ freq: 180, dur: 0.3, type: 'sawtooth', gain: 0.15, slide: -80 });
    noise({ dur: 0.2, gain: 0.1 });
  },
  morse(on) { if (on) tone({ freq: 750, dur: 0.09, type: 'sine', gain: 0.05 }); },
  win() {
    [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, dur: 0.22, type: 'triangle', gain: 0.12, when: i * 0.15 }));
  },
  lose() {
    noise({ dur: 1.2, gain: 0.35 });
    tone({ freq: 100, dur: 1.0, type: 'sawtooth', gain: 0.2, slide: -60 });
  }
};

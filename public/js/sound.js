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

let spatial = null;

function noiseLoop(a, seconds = 2.4) {
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * seconds), a.sampleRate);
  const d = buf.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < d.length; i++) {
    brown = brown * 0.92 + (Math.random() * 2 - 1) * 0.08;
    d[i] = brown * 0.65 + (Math.random() * 2 - 1) * 0.35;
  }
  const src = a.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.start();
  return src;
}

function ensureSpatial() {
  if (spatial) return spatial;
  const a = ac();

  /* Housefly: turbulent wing noise, chopped at ~200 Hz wingbeat. */
  const wings = noiseLoop(a);
  const air = noiseLoop(a, 1.7);

  const wingBp = a.createBiquadFilter();
  wingBp.type = 'bandpass';
  wingBp.frequency.value = 1400;
  wingBp.Q.value = 1.1;

  const bodyBp = a.createBiquadFilter();
  bodyBp.type = 'bandpass';
  bodyBp.frequency.value = 720;
  bodyBp.Q.value = 2.4;

  const hissBp = a.createBiquadFilter();
  hissBp.type = 'bandpass';
  hissBp.frequency.value = 3400;
  hissBp.Q.value = 1.6;

  const am = a.createGain();
  am.gain.value = 0;
  const hissGain = a.createGain();
  hissGain.gain.value = 0.22;
  const bodyGain = a.createGain();
  bodyGain.gain.value = 0.55;

  const wingLfo = a.createOscillator();
  wingLfo.type = 'sine';
  wingLfo.frequency.value = 210;
  const wingDepth = a.createGain();
  wingDepth.gain.value = 0.48;
  const wingBias = a.createConstantSource();
  wingBias.offset.value = 0.5;
  wingLfo.connect(wingDepth).connect(am.gain);
  wingBias.connect(am.gain);
  wingLfo.start();
  wingBias.start();

  wings.connect(wingBp).connect(am);
  air.connect(bodyBp).connect(bodyGain).connect(am);
  air.connect(hissBp).connect(hissGain).connect(am);

  const color = a.createBiquadFilter();
  color.type = 'peaking';
  color.frequency.value = 1800;
  color.Q.value = 0.7;
  color.gain.value = 4;

  const buzzPanner = a.createPanner();
  buzzPanner.panningModel = 'HRTF';
  buzzPanner.distanceModel = 'exponential';
  buzzPanner.refDistance = 0.09;
  buzzPanner.rolloffFactor = 6;
  buzzPanner.maxDistance = 5;

  const buzzGain = a.createGain();
  buzzGain.gain.value = 0;
  am.connect(color).connect(buzzPanner).connect(buzzGain).connect(a.destination);

  const fanOsc = a.createOscillator();
  fanOsc.type = 'sawtooth';
  fanOsc.frequency.value = 78;
  const fanNoiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
  const nd = fanNoiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const fanNoise = a.createBufferSource();
  fanNoise.buffer = fanNoiseBuf;
  fanNoise.loop = true;
  const fanFilter = a.createBiquadFilter();
  fanFilter.type = 'lowpass';
  fanFilter.frequency.value = 420;
  const fanGain = a.createGain();
  fanGain.gain.value = 0;
  fanOsc.connect(fanFilter);
  fanNoise.connect(fanFilter);
  fanFilter.connect(fanGain).connect(a.destination);
  fanOsc.start();
  fanNoise.start();

  spatial = {
    buzzGain, buzzPanner, wingLfo, fanGain, listener: a.listener, ctx: a,
    buzzOn: false, fanOn: false,
    lastFly: null
  };
  return spatial;
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
  flyAudio({ flyPos, earPos, look, up, alive, landed }) {
    if (!alive && !spatial) return;
    const s = ensureSpatial();
    const now = s.ctx.currentTime;
    s.buzzOn = !!alive;
    const vol = !alive ? 0 : landed ? 0.018 : 0.16;
    s.buzzGain.gain.setTargetAtTime(vol, now, alive ? 0.04 : 0.08);
    if (!alive || !flyPos || !earPos) {
      s.lastFly = null;
      if (s.wingLfo) s.wingLfo.frequency.setTargetAtTime(90, now, 0.12);
      return;
    }

    let speed = 0.2;
    if (s.lastFly) {
      const dx = flyPos.x - s.lastFly.x;
      const dy = flyPos.y - s.lastFly.y;
      const dz = flyPos.z - s.lastFly.z;
      speed = Math.min(2.2, Math.hypot(dx, dy, dz) / 0.016);
    }
    s.lastFly = { x: flyPos.x, y: flyPos.y, z: flyPos.z };

    const wingHz = landed
      ? 72 + Math.sin(now * 9) * 8
      : 188 + speed * 28 + Math.sin(now * 13.7) * 14 + Math.sin(now * 3.1) * 9;
    s.wingLfo.frequency.setTargetAtTime(wingHz, now, 0.045);
    if (s.listener.positionX) {
      s.listener.positionX.value = earPos.x;
      s.listener.positionY.value = earPos.y;
      s.listener.positionZ.value = earPos.z;
      if (look && up && s.listener.forwardX) {
        s.listener.forwardX.value = look.x;
        s.listener.forwardY.value = look.y;
        s.listener.forwardZ.value = look.z;
        s.listener.upX.value = up.x;
        s.listener.upY.value = up.y;
        s.listener.upZ.value = up.z;
      }
    } else if (s.listener.setPosition) {
      s.listener.setPosition(earPos.x, earPos.y, earPos.z);
      if (look && up && s.listener.setOrientation) {
        s.listener.setOrientation(look.x, look.y, look.z, up.x, up.y, up.z);
      }
    }
    if (s.buzzPanner.positionX) {
      s.buzzPanner.positionX.value = flyPos.x;
      s.buzzPanner.positionY.value = flyPos.y;
      s.buzzPanner.positionZ.value = flyPos.z;
    } else if (s.buzzPanner.setPosition) {
      s.buzzPanner.setPosition(flyPos.x, flyPos.y, flyPos.z);
    }
  },
  fanHum(on) {
    if (!on && !spatial) return;
    const s = ensureSpatial();
    s.fanOn = !!on;
    s.fanGain.gain.setTargetAtTime(on ? 0.045 : 0, s.ctx.currentTime, 0.12);
  },
  squish() {
    noise({ dur: 0.06, gain: 0.18 });
    tone({ freq: 140, dur: 0.09, type: 'sawtooth', gain: 0.09 });
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

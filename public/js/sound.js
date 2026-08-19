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

  /* Housefly: a bright harmonic wingbeat (upper partials carry the whine)
     plus turbulent air, both chopped at the wingbeat rate. */
  const harm = [0, 0.35, 0.7, 1, 0.92, 0.8, 0.62, 0.48, 0.34, 0.24, 0.16, 0.1];
  const wave = a.createPeriodicWave(new Float32Array(harm.length), Float32Array.from(harm));

  const wingA = a.createOscillator();
  wingA.setPeriodicWave(wave);
  wingA.frequency.value = 265;
  const wingB = a.createOscillator();
  wingB.setPeriodicWave(wave);
  wingB.frequency.value = 265;
  wingB.detune.value = 11; // two wings never quite agree
  const wingBGain = a.createGain();
  wingBGain.gain.value = 0.6;

  const air = noiseLoop(a, 1.7);
  const airBp = a.createBiquadFilter();
  airBp.type = 'bandpass';
  airBp.frequency.value = 3600;
  airBp.Q.value = 0.9;
  const airGain = a.createGain();
  airGain.gain.value = 0.5;

  const am = a.createGain();
  am.gain.value = 0;
  const chop = a.createOscillator();
  chop.type = 'sine';
  chop.frequency.value = 265;
  const chopDepth = a.createGain();
  chopDepth.gain.value = 0.34;
  const chopBias = a.createConstantSource();
  chopBias.offset.value = 0.66;
  chop.connect(chopDepth).connect(am.gain);
  chopBias.connect(am.gain);
  chop.start();
  chopBias.start();

  wingA.connect(am);
  wingB.connect(wingBGain).connect(am);
  air.connect(airBp).connect(airGain).connect(am);
  wingA.start();
  wingB.start();

  const color = a.createBiquadFilter();
  color.type = 'bandpass';
  color.frequency.value = 1500;
  color.Q.value = 0.55;
  const presence = a.createBiquadFilter();
  presence.type = 'highshelf';
  presence.frequency.value = 2600;
  presence.gain.value = 7;

  const buzzPanner = a.createPanner();
  buzzPanner.panningModel = 'HRTF';
  buzzPanner.distanceModel = 'inverse';
  buzzPanner.refDistance = 0.16;
  buzzPanner.rolloffFactor = 2.6;
  buzzPanner.maxDistance = 6;

  const buzzGain = a.createGain();
  buzzGain.gain.value = 0;
  am.connect(color).connect(presence).connect(buzzPanner).connect(buzzGain).connect(a.destination);

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
    buzzGain, buzzPanner, wingA, wingB, chop, color, presence, airGain,
    fanGain, listener: a.listener, ctx: a,
    buzzOn: false, fanOn: false,
    lastFly: null, lastT: 0
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
    const vol = !alive ? 0 : landed ? 0.02 : 0.14;
    s.buzzGain.gain.setTargetAtTime(vol, now, alive ? 0.035 : 0.08);
    if (!alive || !flyPos || !earPos) {
      s.lastFly = null;
      return;
    }

    const dtA = Math.max(0.008, Math.min(0.05, now - s.lastT || 0.016));
    s.lastT = now;

    // Speed drives wingbeat pitch; closing speed drives a small doppler shift.
    let speed = 0.2;
    let closing = 0;
    if (s.lastFly) {
      const dx = flyPos.x - s.lastFly.x;
      const dy = flyPos.y - s.lastFly.y;
      const dz = flyPos.z - s.lastFly.z;
      speed = Math.min(3, Math.hypot(dx, dy, dz) / dtA);
      const ex = flyPos.x - earPos.x, ey = flyPos.y - earPos.y, ez = flyPos.z - earPos.z;
      const d = Math.hypot(ex, ey, ez) || 1;
      closing = -((dx * ex + dy * ey + dz * ez) / d) / dtA;
    }
    s.lastFly = { x: flyPos.x, y: flyPos.y, z: flyPos.z };

    const near = Math.max(0, 1 - flyPos.distanceTo(earPos) / 0.8);
    const wingHz = landed
      ? 26 + Math.sin(now * 7) * 6
      : 268 + speed * 34 + Math.sin(now * 17.3) * 16 + Math.sin(now * 2.7) * 11;
    s.wingA.frequency.setTargetAtTime(wingHz, now, 0.03);
    s.wingB.frequency.setTargetAtTime(wingHz, now, 0.03);
    s.chop.frequency.setTargetAtTime(wingHz, now, 0.03);

    const doppler = Math.max(-90, Math.min(90, (closing / 343) * 1200 * 6));
    s.wingA.detune.setTargetAtTime(doppler, now, 0.04);
    s.wingB.detune.setTargetAtTime(doppler + 11, now, 0.04);

    // Right at the ear it gets brighter and thinner, like it's inside your head.
    s.color.frequency.setTargetAtTime(landed ? 700 : 1300 + near * 1500 + speed * 260, now, 0.05);
    s.presence.gain.setTargetAtTime(landed ? 0 : 5 + near * 7, now, 0.08);
    s.airGain.gain.setTargetAtTime(landed ? 0.12 : 0.4 + near * 0.35, now, 0.06);

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

/** Morse Code — glass dome lamp, delayed start, RST / SND / TX, tuning knob. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CanvasTex, displayMaterial, drawReadout, drawLabel, labelMaterial } from '../textUtil.js';
import { sound } from '../../sound.js';

const UNIT = 0.22; // seconds per morse unit
const START_DELAY = 5; // stay dark after the round begins

function buildTimeline(pattern) {
  const events = [];
  for (const letter of pattern) {
    for (const sym of letter) {
      events.push({ on: true, dur: sym === '.' ? UNIT : UNIT * 3 });
      events.push({ on: false, dur: UNIT });
    }
    events.push({ on: false, dur: UNIT * 3 });
  }
  events.push({ on: false, dur: UNIT * 7 });
  let t = 0;
  return events.map((e) => ({ ...e, start: t, end: (t += e.dur) }));
}

function faceButton(label, { x, z = 0.09, w = 0.05, d = 0.038, bg, color = '#000000', face, side }) {
  const tex = new CanvasTex(160, 96);
  tex.draw((ctx, cw, ch) => drawLabel(ctx, cw, ch, label, { bg, color }));
  const sideMat = new THREE.MeshStandardMaterial({ color: side, roughness: 0.5, metalness: 0.15 });
  const btn = new THREE.Mesh(new RoundedBoxGeometry(w, 0.026, d, 2, 0.007),
    [sideMat, sideMat, labelMaterial(tex), sideMat, sideMat, sideMat]);
  btn.position.set(x, 0.013, z);
  btn.castShadow = true;
  btn.userData.highlightTargets = [btn];
  btn.userData._tex = tex;
  btn.userData._paint = (text, fill) => {
    tex.draw((ctx, cw, ch) => drawLabel(ctx, cw, ch, text, { bg: fill, color }));
  };
  return btn;
}

export function build({ view, send }) {
  const group = new THREE.Group();
  const state = { selected: view.selected, freqs: view.frequencies, done: false, audio: false };

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.056, 0.018, 24),
    new THREE.MeshStandardMaterial({ color: 0x3a3f4a, metalness: 0.7, roughness: 0.4 })
  );
  base.position.set(0, 0.009, -0.08);
  base.castShadow = true;

  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0x2a230d, emissive: 0xffc83d, emissiveIntensity: 0, roughness: 0.3
  });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 20, 16), bulbMat);
  bulb.scale.y = 0.85;
  bulb.position.set(0, 0.038, -0.08);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.042, 24, 18),
    new THREE.MeshPhysicalMaterial({
      color: 0xfff2cf, transmission: 0.9, opacity: 1, transparent: true,
      roughness: 0.1, thickness: 0.004, ior: 1.45
    })
  );
  dome.scale.y = 0.85;
  dome.position.set(0, 0.038, -0.08);

  const lampLight = new THREE.PointLight(0xffc83d, 0, 0.7, 2);
  lampLight.position.set(0, 0.05, -0.08);
  group.add(base, bulb, dome, lampLight);

  const freqTex = new CanvasTex(512, 128);
  const freqScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.042), displayMaterial(freqTex));
  freqScreen.rotation.x = -Math.PI / 2;
  freqScreen.position.set(0, 0.0265, 0.012);
  const freqHousing = new THREE.Mesh(new RoundedBoxGeometry(0.19, 0.025, 0.055, 2, 0.006),
    new THREE.MeshStandardMaterial({ color: 0x20242c, roughness: 0.5, metalness: 0.3 }));
  freqHousing.position.set(0, 0.0125, 0.012);
  freqHousing.castShadow = true;
  group.add(freqHousing, freqScreen);

  const knob = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.024, 0.022, 20),
    new THREE.MeshStandardMaterial({ color: 0x9aa2b5, metalness: 0.85, roughness: 0.3 })
  );
  const notch = new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.004, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x16181d }));
  notch.position.set(0, 0.012, -0.006);
  knob.add(notch);
  knob.position.set(-0.108, 0.011, 0.09);
  knob.castShadow = true;
  const QUARTER = Math.PI / 2;
  let knobTarget = 0;
  let knobAngle = 0;
  let lastSel = view.selected || 0;
  function tuneTo(index) {
    const n = state.freqs.length;
    const next = ((index % n) + n) % n;
    if (next !== state.selected) send({ type: 'tune', index: next });
  }
  knob.userData.onClick = () => {
    knobTarget += QUARTER;
    lastSel = (lastSel + 1) % Math.max(1, state.freqs.length);
    tuneTo(state.selected + 1);
  };
  knob.userData.highlightTargets = [knob];
  group.add(knob);

  const snd = faceButton('SND', {
    x: -0.038, bg: '#cfd6e4', side: 0x32384a
  });
  function paintSnd() {
    snd.userData._paint('SND', state.audio ? '#7dff9a' : '#cfd6e4');
  }
  snd.userData.onClick = () => {
    state.audio = !state.audio;
    paintSnd();
    setLamp(lampOn);
  };
  group.add(snd);

  const rst = faceButton('RST', {
    x: 0.028, bg: '#4a86d8', side: 0x1f4f8a
  });
  rst.userData.onClick = () => {
    clock = 0;
    setLamp(false);
  };
  group.add(rst);

  const tx = faceButton('TX', {
    x: 0.1, w: 0.052, bg: '#c43240', side: 0x8c1f2b
  });
  tx.userData.onClick = () => send({ type: 'transmit' });
  group.add(tx);

  const timeline = buildTimeline(view.pattern);
  const loopLen = timeline[timeline.length - 1].end;
  let clock = -START_DELAY;
  let lampOn = false;
  let toneOn = false;

  function setLamp(on) {
    if (on !== lampOn) {
      lampOn = on;
      bulbMat.emissiveIntensity = on ? 2.2 : 0;
      lampLight.intensity = on ? 1.6 : 0;
    }
    const want = on && state.audio && !state.done;
    if (want !== toneOn) {
      toneOn = want;
      sound.morseTone(want);
    }
  }

  function redrawFreq() {
    freqTex.draw((ctx, w, h) =>
      drawReadout(ctx, w, h, state.freqs[state.selected].toFixed(3) + ' MHz', { color: '#ffd23f' }));
  }

  function update(v) {
    state.selected = v.selected;
    const n = Math.max(1, state.freqs.length);
    if (v.selected !== lastSel) {
      let delta = v.selected - lastSel;
      if (delta > n / 2) delta -= n;
      if (delta < -n / 2) delta += n;
      knobTarget += delta * QUARTER;
      lastSel = v.selected;
    }
    redrawFreq();
  }

  function tick(dt, _t, solved) {
    if (Math.abs(knobTarget - knobAngle) > 0.001) {
      const dir = Math.sign(knobTarget - knobAngle);
      knobAngle += dir * Math.min(Math.abs(knobTarget - knobAngle), dt * 10);
      knob.rotation.y = knobAngle;
    }
    if (solved) {
      state.done = true;
      setLamp(false);
      return;
    }
    clock += dt;
    if (clock < 0) {
      setLamp(false);
      return;
    }
    clock = clock % loopLen;
    const ev = timeline.find((e) => clock >= e.start && clock < e.end);
    setLamp(!!(ev && ev.on));
  }

  redrawFreq();
  return { group, update, tick };
}

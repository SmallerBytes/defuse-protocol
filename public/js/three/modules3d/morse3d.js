/** Morse Code — glass dome lamp with a real light source, tuning knob, TX key. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CanvasTex, displayMaterial, drawReadout, drawLabel, labelMaterial } from '../textUtil.js';

const UNIT = 0.22; // seconds per morse unit

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

export function build({ view, send }) {
  const group = new THREE.Group();
  const state = { selected: view.selected, freqs: view.frequencies, done: false };

  // lamp base + glass dome + bulb
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

  // frequency readout
  const freqTex = new CanvasTex(512, 128);
  const freqScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.042), displayMaterial(freqTex));
  freqScreen.rotation.x = -Math.PI / 2;
  freqScreen.position.set(0, 0.0265, 0.012);
  const freqHousing = new THREE.Mesh(new RoundedBoxGeometry(0.19, 0.025, 0.055, 2, 0.006),
    new THREE.MeshStandardMaterial({ color: 0x20242c, roughness: 0.5, metalness: 0.3 }));
  freqHousing.position.set(0, 0.0125, 0.012);
  freqHousing.castShadow = true;
  group.add(freqHousing, freqScreen);

  // tuning knob + arrows
  const knob = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.03, 0.024, 24),
    new THREE.MeshStandardMaterial({ color: 0x9aa2b5, metalness: 0.85, roughness: 0.3 })
  );
  const notch = new THREE.Mesh(
    new THREE.BoxGeometry(0.004, 0.004, 0.024),
    new THREE.MeshStandardMaterial({ color: 0x16181d })
  );
  notch.position.set(0, 0.013, -0.008);
  knob.add(notch);
  knob.position.set(-0.07, 0.012, 0.09);
  knob.castShadow = true;
  group.add(knob);

  const arrowGeo = new RoundedBoxGeometry(0.026, 0.018, 0.03, 2, 0.005);
  const arrows = [];
  [['<', -0.112, -1], ['>', -0.028, +1]].forEach(([label, x, dir]) => {
    const tex = new CanvasTex(96, 96);
    tex.draw((ctx, w, h) => drawLabel(ctx, w, h, label, { bg: '#cfd6e4' }));
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x32384a, roughness: 0.55, metalness: 0.2 });
    const btn = new THREE.Mesh(arrowGeo, [sideMat, sideMat, labelMaterial(tex), sideMat, sideMat, sideMat]);
    btn.position.set(x, 0.009, 0.09);
    btn.castShadow = true;
    btn.userData.onClick = () => {
      const next = Math.min(Math.max(state.selected + dir, 0), state.freqs.length - 1);
      if (next !== state.selected) send({ type: 'tune', index: next });
    };
    btn.userData.highlightTargets = [btn];
    group.add(btn);
    arrows.push(btn);
  });

  // TX key
  const txTex = new CanvasTex(160, 96);
  txTex.draw((ctx, w, h) => drawLabel(ctx, w, h, 'TX', { bg: '#c43240', color: '#ffffff' }));
  const txSide = new THREE.MeshStandardMaterial({ color: 0x8c1f2b, roughness: 0.5 });
  const tx = new THREE.Mesh(new RoundedBoxGeometry(0.062, 0.026, 0.04, 2, 0.007),
    [txSide, txSide, labelMaterial(txTex), txSide, txSide, txSide]);
  tx.position.set(0.075, 0.013, 0.09);
  tx.castShadow = true;
  tx.userData.onClick = () => send({ type: 'transmit' });
  tx.userData.highlightTargets = [tx];
  group.add(tx);

  // flash timeline
  const timeline = buildTimeline(view.pattern);
  const loopLen = timeline[timeline.length - 1].end;
  let clock = 0;

  function redrawFreq() {
    freqTex.draw((ctx, w, h) =>
      drawReadout(ctx, w, h, state.freqs[state.selected].toFixed(3) + ' MHz', { color: '#ffd23f' }));
    knob.rotation.y = -(state.selected / Math.max(1, state.freqs.length - 1)) * Math.PI * 1.5;
  }

  function update(v) {
    state.selected = v.selected;
    redrawFreq();
  }

  function tick(dt, _t, solved) {
    if (solved) {
      state.done = true;
      bulbMat.emissiveIntensity = 0;
      lampLight.intensity = 0;
      return;
    }
    clock = (clock + dt) % loopLen;
    const ev = timeline.find((e) => clock >= e.start && clock < e.end);
    const on = ev ? ev.on : false;
    bulbMat.emissiveIntensity = on ? 2.2 : 0;
    lampLight.intensity = on ? 1.6 : 0;
  }

  redrawFreq();
  return { group, update, tick };
}

/** Weapons Release — stores panel: MASTER ARM lever, station knob, fuze switch, code thumbwheels, guarded PICKLE. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CanvasTex, displayMaterial, labelMaterial, drawLabel, drawReadout } from '../textUtil.js';

export function build({ view, send }) {
  const group = new THREE.Group();

  /* ---- targeting screen (back, tilted) ---- */
  const housing = new THREE.Mesh(new RoundedBoxGeometry(0.27, 0.05, 0.09, 3, 0.01),
    new THREE.MeshStandardMaterial({ color: 0x232019, roughness: 0.5, metalness: 0.35 }));
  housing.position.set(0, 0.025, -0.095);
  housing.rotation.x = 0.18;
  housing.castShadow = true;
  group.add(housing);

  const cardTex = new CanvasTex(768, 200);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.245, 0.066), displayMaterial(cardTex));
  screen.rotation.x = -Math.PI / 2 + 0.18;
  screen.position.set(0, 0.0505, -0.0905);
  group.add(screen);

  /* ---- MASTER ARM lever (left) ---- */
  const armGroup = new THREE.Group();
  armGroup.position.set(-0.105, 0, 0.012);
  const armBase = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.016, 0.055, 2, 0.005),
    new THREE.MeshStandardMaterial({ color: 0x3a2a2a, roughness: 0.55, metalness: 0.3 }));
  armBase.position.y = 0.008;
  armBase.castShadow = true;
  armGroup.add(armBase);

  const lever = new THREE.Group();
  const leverArm = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.006, 0.05, 10),
    new THREE.MeshStandardMaterial({ color: 0x9aa3b0, metalness: 0.85, roughness: 0.3 }));
  leverArm.position.y = 0.025;
  const leverTipMat = new THREE.MeshStandardMaterial({ color: 0xb33030, roughness: 0.4 });
  const leverTip = new THREE.Mesh(new THREE.SphereGeometry(0.011, 14, 12), leverTipMat);
  leverTip.position.y = 0.052;
  lever.add(leverArm, leverTip);
  lever.position.y = 0.014;
  lever.rotation.x = 0.55; // SAFE = tilted toward player
  armGroup.add(lever);

  const armLabelTex = new CanvasTex(160, 64);
  armLabelTex.draw((ctx, w, h) => drawLabel(ctx, w, h, 'MASTER ARM', { bg: '#3a2a2a', color: '#e0d6c0', font: `bold 24px 'Consolas', monospace` }));
  const armLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.02), labelMaterial(armLabelTex));
  armLabel.rotation.x = -Math.PI / 2;
  armLabel.position.set(0, 0.0165, -0.038);
  armGroup.add(armLabel);

  // Oversized invisible hitbox so the lever is easy to grab in VR
  const armHit = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.08),
    new THREE.MeshBasicMaterial({ visible: false }));
  armHit.position.y = 0.04;
  armHit.userData.onClick = () => send({ type: 'arm' });
  armHit.userData.highlightTargets = [leverTip];
  armGroup.add(armHit);
  group.add(armGroup);

  /* ---- STATION knob + weapon readout (center) ---- */
  const stationTex = new CanvasTex(320, 96);
  const stationScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.085, 0.026), displayMaterial(stationTex));
  stationScreen.rotation.x = -Math.PI / 2;
  stationScreen.position.set(-0.015, 0.0205, -0.02);
  const stationHousing = new THREE.Mesh(new RoundedBoxGeometry(0.095, 0.02, 0.036, 2, 0.005),
    new THREE.MeshStandardMaterial({ color: 0x20242c, roughness: 0.5, metalness: 0.3 }));
  stationHousing.position.set(-0.015, 0.01, -0.02);
  stationHousing.castShadow = true;
  group.add(stationHousing, stationScreen);

  const knob = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.024, 0.022, 20),
    new THREE.MeshStandardMaterial({ color: 0x9aa2b5, metalness: 0.85, roughness: 0.3 })
  );
  const notch = new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.004, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x16181d }));
  notch.position.set(0, 0.012, -0.006);
  knob.add(notch);
  knob.position.set(-0.015, 0.011, 0.022);
  knob.castShadow = true;
  knob.userData.onClick = () => send({ type: 'station' });
  knob.userData.highlightTargets = [knob];
  group.add(knob);

  /* ---- FUZE switch (right of knob) ---- */
  const fuzeTex = new CanvasTex(192, 96);
  const fuzeSide = new THREE.MeshStandardMaterial({ color: 0x32384a, roughness: 0.55, metalness: 0.2 });
  const fuzeBtn = new THREE.Mesh(
    new RoundedBoxGeometry(0.055, 0.018, 0.032, 2, 0.004),
    [fuzeSide, fuzeSide, labelMaterial(fuzeTex), fuzeSide, fuzeSide, fuzeSide]
  );
  fuzeBtn.position.set(0.075, 0.009, -0.02);
  fuzeBtn.castShadow = true;
  fuzeBtn.userData.onClick = () => send({ type: 'fuze' });
  fuzeBtn.userData.highlightTargets = [fuzeBtn];
  group.add(fuzeBtn);

  /* ---- CODE thumbwheels (front-left) ---- */
  const wheels = [];
  for (let i = 0; i < 3; i++) {
    const tex = new CanvasTex(96, 96);
    const side = new THREE.MeshStandardMaterial({ color: 0x1a1d24, roughness: 0.45, metalness: 0.4 });
    const wheel = new THREE.Mesh(
      new RoundedBoxGeometry(0.026, 0.024, 0.032, 2, 0.004),
      [side, side, labelMaterial(tex), side, side, side]
    );
    wheel.position.set(-0.098 + i * 0.033, 0.012, 0.088);
    wheel.castShadow = true;
    wheel.userData.onClick = () => send({ type: 'wheel', index: i });
    wheel.userData.highlightTargets = [wheel];
    group.add(wheel);
    wheels.push({ wheel, tex });
  }
  const codeLabelTex = new CanvasTex(192, 48);
  codeLabelTex.draw((ctx, w, h) => drawLabel(ctx, w, h, 'CODE', { bg: '#2a2d35', color: '#cfd6e4', font: `bold 28px 'Consolas', monospace` }));
  const codeLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.015), labelMaterial(codeLabelTex));
  codeLabel.rotation.x = -Math.PI / 2;
  codeLabel.position.set(-0.065, 0.0005, 0.062);
  group.add(codeLabel);

  /* ---- PICKLE button (front-right, guarded ring) ---- */
  const guard = new THREE.Mesh(
    new THREE.TorusGeometry(0.026, 0.004, 10, 24),
    new THREE.MeshStandardMaterial({ color: 0xc9b458, metalness: 0.6, roughness: 0.45 })
  );
  guard.rotation.x = Math.PI / 2;
  guard.position.set(0.085, 0.008, 0.088);
  group.add(guard);

  const pickleMat = new THREE.MeshStandardMaterial({ color: 0xb32430, roughness: 0.4, metalness: 0.2 });
  const pickle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.018, 20), pickleMat);
  pickle.position.set(0.085, 0.012, 0.088);
  pickle.castShadow = true;
  pickle.userData.onClick = () => send({ type: 'pickle' });
  pickle.userData.highlightTargets = [pickle];
  group.add(pickle);

  function update(v) {
    cardTex.draw((ctx, w, h) => {
      ctx.fillStyle = '#0a1206';
      ctx.fillRect(0, 0, w, h);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.font = `bold 30px 'Consolas', monospace`;
      ctx.fillStyle = v.masterArm ? '#ff5a5a' : '#77dd88';
      ctx.fillText(v.masterArm ? 'ARM' : 'SAFE', 16, 26);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#7fb4ff';
      ctx.fillText(v.card ? `TGT ${v.index}/${v.total}` : 'COMPLETE', w - 16, 26);
      ctx.textAlign = 'center';
      ctx.font = `bold 34px 'Consolas', monospace`;
      ctx.fillStyle = '#c9e8a0';
      const text = v.card || (v.allServiced && v.masterArm ? 'SAFE THE PANEL' : 'ALL TARGETS SERVICED');
      // two-line wrap for long cards
      const words = String(text).split(' ');
      let line1 = '', line2 = '';
      for (const word of words) {
        const tryLine = line1 ? `${line1} ${word}` : word;
        if (ctx.measureText(tryLine).width > w * 0.94 || line2) {
          line2 = line2 ? `${line2} ${word}` : word;
        } else {
          line1 = tryLine;
        }
      }
      if (line2) {
        ctx.fillText(line1, w / 2, 92);
        ctx.fillText(line2, w / 2, 140);
      } else {
        ctx.fillText(line1, w / 2, 116);
      }
    });

    lever.rotation.x = v.masterArm ? -0.55 : 0.55;
    leverTipMat.color.setHex(v.masterArm ? 0xff3333 : 0xb33030);

    stationTex.draw((ctx, w, h) => drawReadout(ctx, w, h, v.weapon, { color: '#ffd23f' }));
    fuzeTex.draw((ctx, w, h) => drawLabel(ctx, w, h, v.fuze, {
      bg: v.fuze === 'TAIL' ? '#3a3020' : '#cfd6e4',
      color: v.fuze === 'TAIL' ? '#ffd23f' : '#181818',
      font: `bold 40px 'Consolas', monospace`
    }));
    wheels.forEach((wh, i) => {
      wh.tex.draw((ctx, w, h) => drawLabel(ctx, w, h, String(v.code[i]), { bg: '#d8d2c0', font: `bold 60px 'Consolas', monospace` }));
    });
  }

  update(view);
  return { group, update };
}

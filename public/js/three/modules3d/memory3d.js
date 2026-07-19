/** Memory Sequence — recessed LED display housing + four labeled keycaps. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CanvasTex, displayMaterial, labelMaterial, drawReadout, drawLabel } from '../textUtil.js';

const housingMat = new THREE.MeshStandardMaterial({ color: 0x20242c, roughness: 0.5, metalness: 0.3 });

export function build({ view, send }) {
  const group = new THREE.Group();

  // display housing (raised block at the back)
  const housing = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.045, 0.1, 3, 0.008), housingMat);
  housing.position.set(0, 0.022, -0.085);
  housing.castShadow = true;
  group.add(housing);

  const dispTex = new CanvasTex(512, 192);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.075), displayMaterial(dispTex));
  screen.rotation.x = -Math.PI / 2;
  screen.position.set(0, 0.0455, -0.085);
  group.add(screen);

  // four keycaps
  const capGeo = new RoundedBoxGeometry(0.05, 0.034, 0.06, 3, 0.006);
  const caps = [];
  for (let i = 0; i < view.labels.length; i++) {
    const tex = new CanvasTex(128, 128);
    const topMat = labelMaterial(tex);
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x32384a, roughness: 0.55, metalness: 0.2 });
    const cap = new THREE.Mesh(capGeo, [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
    cap.position.set(-0.0875 + i * 0.0585, 0.017, 0.07);
    cap.castShadow = true;
    cap.userData.onClick = () => {
      caps[i].anim = 1;
      send({ type: 'press', position: i + 1 });
    };
    cap.userData.highlightTargets = [cap];
    group.add(cap);
    caps.push({ cap, tex, anim: 0, baseY: 0.017 });
  }

  function redraw(v) {
    dispTex.draw((ctx, w, h) => {
      drawReadout(ctx, w, h, String(v.display), { color: '#39d98a', font: `bold 120px 'Consolas', monospace` });
      // stage pips along the bottom of the screen glass
      const total = v.totalStages;
      const r = 9;
      const x0 = w / 2 - ((total - 1) * 30) / 2;
      for (let s = 1; s <= total; s++) {
        ctx.beginPath();
        ctx.arc(x0 + (s - 1) * 30, h - 22, r, 0, Math.PI * 2);
        ctx.fillStyle = s < v.stage ? '#ffd23f' : '#173324';
        ctx.fill();
      }
    });
    v.labels.forEach((label, i) => {
      caps[i].tex.draw((ctx, w, h) => drawLabel(ctx, w, h, String(label), { bg: '#cfd6e4' }));
    });
  }

  function tick(dt) {
    for (const c of caps) {
      if (c.anim > 0) {
        c.anim = Math.max(0, c.anim - dt * 6);
        c.cap.position.y = c.baseY - Math.sin(c.anim * Math.PI) * 0.01;
      }
    }
  }

  redraw(view);
  return { group, update: redraw, tick };
}

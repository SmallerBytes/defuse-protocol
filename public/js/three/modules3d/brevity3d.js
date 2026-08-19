/** Brevity Code — CRT display word + six brevity-word buttons (2x3). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CanvasTex, displayMaterial, labelMaterial, drawReadout, drawLabel } from '../textUtil.js';

export function build({ view, send }) {
  const group = new THREE.Group();

  const housing = new THREE.Mesh(new RoundedBoxGeometry(0.27, 0.05, 0.075, 3, 0.01),
    new THREE.MeshStandardMaterial({ color: 0x1d2129, roughness: 0.45, metalness: 0.35 }));
  housing.position.set(0, 0.025, -0.098);
  housing.rotation.x = 0.18;
  housing.castShadow = true;
  group.add(housing);

  const dispTex = new CanvasTex(640, 160);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.058), displayMaterial(dispTex));
  screen.rotation.x = -Math.PI / 2 + 0.18;
  screen.position.set(0, 0.051, -0.095);
  group.add(screen);

  const btnGeo = new RoundedBoxGeometry(0.108, 0.02, 0.04, 2, 0.005);
  const buttons = [];
  for (let i = 0; i < 6; i++) {
    const tex = new CanvasTex(384, 112);
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x32384a, roughness: 0.55, metalness: 0.2 });
    const btn = new THREE.Mesh(btnGeo, [sideMat, sideMat, labelMaterial(tex), sideMat, sideMat, sideMat]);
    btn.position.set(i % 2 === 0 ? -0.061 : 0.061, 0.01, -0.028 + Math.floor(i / 2) * 0.058);
    btn.castShadow = true;
    btn.userData.highlightTargets = [btn];
    group.add(btn);
    buttons.push({ btn, tex, label: null });
  }

  function update(v) {
    dispTex.draw((ctx, w, h) => {
      drawReadout(ctx, w, h, v.display || '—', { color: '#ffd23f', font: `bold 64px 'Consolas', monospace` });
      ctx.font = `bold 22px 'Consolas', monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#7fb4ff';
      ctx.fillText(`STAGE ${v.stage}/${v.total}`, 12, 8);
    });

    buttons.forEach((b, i) => {
      const label = v.buttons[i] || null;
      b.label = label;
      b.btn.visible = !!label;
      if (label) {
        b.tex.draw((ctx, w, h) => drawLabel(ctx, w, h, label, { bg: '#cfd6e4', font: `bold 46px 'Consolas', monospace` }));
        b.btn.userData.onClick = () => send({ type: 'press', label });
      } else {
        b.btn.userData.onClick = null;
      }
    });
  }

  update(view);
  return { group, update };
}

/** Weapons Release — targeting-pod screen + 2x2 rack of weapon buttons. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CanvasTex, displayMaterial, labelMaterial, drawWrapped, drawLabel } from '../textUtil.js';

export function build({ view, send }) {
  const group = new THREE.Group();

  const housing = new THREE.Mesh(new RoundedBoxGeometry(0.27, 0.05, 0.105, 3, 0.01),
    new THREE.MeshStandardMaterial({ color: 0x1d2129, roughness: 0.45, metalness: 0.35 }));
  housing.position.set(0, 0.025, -0.085);
  housing.rotation.x = 0.18;
  housing.castShadow = true;
  group.add(housing);

  const cardTex = new CanvasTex(640, 224);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.082), displayMaterial(cardTex));
  screen.rotation.x = -Math.PI / 2 + 0.18;
  screen.position.set(0, 0.051, -0.0805);
  group.add(screen);

  const btnGeo = new RoundedBoxGeometry(0.108, 0.02, 0.046, 2, 0.005);
  const buttons = [];
  for (let i = 0; i < 4; i++) {
    const tex = new CanvasTex(384, 128);
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x3d3a30, roughness: 0.55, metalness: 0.25 });
    const btn = new THREE.Mesh(btnGeo, [sideMat, sideMat, labelMaterial(tex), sideMat, sideMat, sideMat]);
    btn.position.set(i % 2 === 0 ? -0.061 : 0.061, 0.01, 0.038 + Math.floor(i / 2) * 0.06);
    btn.castShadow = true;
    btn.userData.highlightTargets = [btn];
    group.add(btn);
    buttons.push({ btn, tex, weapon: null });
  }

  function update(v) {
    const header = v.card ? `TGT ${v.index}/${v.total}` : 'WEAPONS SAFE';
    cardTex.draw((ctx, w, h) => {
      drawWrapped(ctx, w, h, v.card || 'ALL TARGETS SERVICED', { size: 30 });
      ctx.font = `bold 26px 'Consolas', monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#7fb4ff';
      ctx.fillText(header, 12, 8);
    });

    buttons.forEach((b, i) => {
      const weapon = v.weapons[i] || null;
      b.weapon = weapon;
      b.btn.visible = !!weapon;
      if (weapon) {
        b.tex.draw((ctx, w, h) => drawLabel(ctx, w, h, weapon, { bg: '#e8dfc8', font: `bold 58px 'Consolas', monospace` }));
        b.btn.userData.onClick = () => send({ type: 'release', weapon });
      } else {
        b.btn.userData.onClick = null;
      }
    });
  }

  update(view);
  return { group, update };
}

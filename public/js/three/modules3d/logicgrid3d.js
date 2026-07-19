/** Logic Grid — amber CRT-style question screen + three answer bars. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CanvasTex, displayMaterial, labelMaterial, drawWrapped, drawLabel } from '../textUtil.js';

export function build({ view, send }) {
  const group = new THREE.Group();

  // question screen housing, tilted toward the viewer
  const housing = new THREE.Mesh(new RoundedBoxGeometry(0.27, 0.05, 0.105, 3, 0.01),
    new THREE.MeshStandardMaterial({ color: 0x1d2129, roughness: 0.45, metalness: 0.35 }));
  housing.position.set(0, 0.025, -0.085);
  housing.rotation.x = 0.18;
  housing.castShadow = true;
  group.add(housing);

  const qTex = new CanvasTex(640, 224);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.082), displayMaterial(qTex));
  screen.rotation.x = -Math.PI / 2 + 0.18;
  screen.position.set(0, 0.051, -0.0805);
  group.add(screen);

  // three answer bars
  const barGeo = new RoundedBoxGeometry(0.24, 0.022, 0.038, 2, 0.006);
  const bars = [];
  for (let i = 0; i < 3; i++) {
    const tex = new CanvasTex(512, 96);
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x32384a, roughness: 0.55, metalness: 0.2 });
    const bar = new THREE.Mesh(barGeo, [sideMat, sideMat, labelMaterial(tex), sideMat, sideMat, sideMat]);
    bar.position.set(0, 0.011, 0.005 + i * 0.05);
    bar.castShadow = true;
    bar.userData.highlightTargets = [bar];
    group.add(bar);
    bars.push({ bar, tex, option: null });
  }

  function update(v) {
    qTex.draw((ctx, w, h) => drawWrapped(ctx, w, h, v.question || 'STANDBY', { size: 40 }));
    bars.forEach((b, i) => {
      const option = v.options[i] || null;
      b.option = option;
      b.bar.visible = !!option;
      if (option) {
        b.tex.draw((ctx, w, h) => drawLabel(ctx, w, h, option, { bg: '#cfd6e4', font: `bold 52px 'Consolas', monospace` }));
        b.bar.userData.onClick = () => send({ type: 'answer', option });
      } else {
        b.bar.userData.onClick = null;
      }
    });
  }

  update(view);
  return { group, update };
}

/** Logic Grid — CRT question screen + clue reader + answer bars. */
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

  const qTex = new CanvasTex(640, 224);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.082), displayMaterial(qTex));
  screen.rotation.x = -Math.PI / 2 + 0.18;
  screen.position.set(0, 0.051, -0.0805);
  group.add(screen);

  // Clue readout (Defuser reads these aloud to Experts)
  const clueTex = new CanvasTex(640, 160);
  const clueScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.048), displayMaterial(clueTex));
  clueScreen.rotation.x = -Math.PI / 2;
  clueScreen.position.set(0, 0.028, -0.02);
  group.add(clueScreen);

  const nextTex = new CanvasTex(160, 64);
  nextTex.draw((ctx, w, h) => drawLabel(ctx, w, h, 'NOTE ▶', { bg: '#cfd6e4', font: `bold 36px 'Consolas', monospace` }));
  const nextSide = new THREE.MeshStandardMaterial({ color: 0x32384a, roughness: 0.55, metalness: 0.2 });
  const nextBtn = new THREE.Mesh(
    new RoundedBoxGeometry(0.08, 0.018, 0.032, 2, 0.004),
    [nextSide, nextSide, labelMaterial(nextTex), nextSide, nextSide, nextSide]
  );
  nextBtn.position.set(0.09, 0.009, -0.055);
  nextBtn.castShadow = true;
  nextBtn.userData.onClick = () => send({ type: 'nextClue' });
  nextBtn.userData.highlightTargets = [nextBtn];
  group.add(nextBtn);

  const barGeo = new RoundedBoxGeometry(0.24, 0.022, 0.038, 2, 0.006);
  const bars = [];
  for (let i = 0; i < 3; i++) {
    const tex = new CanvasTex(512, 96);
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x32384a, roughness: 0.55, metalness: 0.2 });
    const bar = new THREE.Mesh(barGeo, [sideMat, sideMat, labelMaterial(tex), sideMat, sideMat, sideMat]);
    bar.position.set(0, 0.011, 0.04 + i * 0.048);
    bar.castShadow = true;
    bar.userData.highlightTargets = [bar];
    group.add(bar);
    bars.push({ bar, tex, option: null });
  }

  function update(v) {
    qTex.draw((ctx, w, h) => drawWrapped(ctx, w, h, v.question || 'STANDBY', { size: 36 }));

    const clues = v.clues || [];
    const idx = v.clueIndex || 0;
    const line = clues.length
      ? `NOTE ${idx + 1}/${clues.length}: ${clues[idx]}`
      : 'NO INTERCEPTED NOTES';
    clueTex.draw((ctx, w, h) => drawWrapped(ctx, w, h, line, { color: '#9fe8bd', bg: '#06120c', size: 28 }));

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

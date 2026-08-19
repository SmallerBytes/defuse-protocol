/** Radio Net — prompt screen (callsign / challenge) + 2x2 option buttons. */
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

  const promptTex = new CanvasTex(640, 224);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.082), displayMaterial(promptTex));
  screen.rotation.x = -Math.PI / 2 + 0.18;
  screen.position.set(0, 0.051, -0.0805);
  group.add(screen);

  const btnGeo = new RoundedBoxGeometry(0.108, 0.02, 0.046, 2, 0.005);
  const buttons = [];
  for (let i = 0; i < 4; i++) {
    const tex = new CanvasTex(384, 128);
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x2e3a4a, roughness: 0.55, metalness: 0.25 });
    const btn = new THREE.Mesh(btnGeo, [sideMat, sideMat, labelMaterial(tex), sideMat, sideMat, sideMat]);
    btn.position.set(i % 2 === 0 ? -0.061 : 0.061, 0.01, 0.038 + Math.floor(i / 2) * 0.06);
    btn.castShadow = true;
    btn.userData.highlightTargets = [btn];
    group.add(btn);
    buttons.push({ btn, tex, option: null });
  }

  function update(v) {
    let header;
    if (v.phase === 'net') header = `NET ${v.round}/${v.total} — TUNE FOR`;
    else if (v.phase === 'auth') header = `AUTH ${v.round}/${v.total} — REPLY TO`;
    else header = 'COMMS SECURE';

    promptTex.draw((ctx, w, h) => {
      drawWrapped(ctx, w, h, v.prompt || '—', { size: 40 });
      ctx.font = `bold 24px 'Consolas', monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#7fb4ff';
      ctx.fillText(header, 12, 8);
    });

    buttons.forEach((b, i) => {
      const option = v.options[i] ?? null;
      b.option = option;
      b.btn.visible = option !== null;
      if (option !== null) {
        const label = v.phase === 'net' ? String(option) : String(option);
        b.tex.draw((ctx, w, h) => drawLabel(ctx, w, h, label, { bg: '#cfd6e4', font: `bold 58px 'Consolas', monospace` }));
        b.btn.userData.onClick = () => {
          if (v.phase === 'net') send({ type: 'tune', freq: option });
          else if (v.phase === 'auth') send({ type: 'respond', letter: option });
        };
      } else {
        b.btn.userData.onClick = null;
      }
    });
  }

  update(view);
  return { group, update };
}

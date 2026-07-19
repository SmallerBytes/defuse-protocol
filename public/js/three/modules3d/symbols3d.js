/** Symbol Matching — four physical keycaps with printed glyph legends. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CanvasTex, labelMaterial, drawLabel } from '../textUtil.js';

const capGeo = new RoundedBoxGeometry(0.105, 0.038, 0.105, 3, 0.008);

export function build({ view, send }) {
  const group = new THREE.Group();
  const caps = [];
  const positions = [[-0.062, -0.062], [0.062, -0.062], [-0.062, 0.062], [0.062, 0.062]];

  view.symbols.forEach((s, i) => {
    const tex = new CanvasTex(160, 160);
    tex.draw((ctx, w, h) => drawLabel(ctx, w, h, s.glyph, { font: `bold 110px 'Consolas', serif` }));
    const topMat = labelMaterial(tex);
    // per-cap side material so hover highlights don't bleed across caps
    const sideMat = new THREE.MeshStandardMaterial({ color: 0xd9d2ba, roughness: 0.6, metalness: 0.02 });
    // BoxGeometry material order: +x,-x,+y,-y,+z,-z — legend on top (+y)
    const cap = new THREE.Mesh(capGeo, [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
    cap.position.set(positions[i][0], 0.019, positions[i][1]);
    cap.castShadow = true;
    cap.userData.onClick = () => send({ type: 'press', glyph: s.glyph });
    cap.userData.highlightTargets = [cap];
    group.add(cap);
    caps.push({ cap, tex, glyph: s.glyph, anim: 0, baseY: 0.019 });
  });

  function update(v) {
    v.symbols.forEach((s, i) => {
      const c = caps[i];
      c.tex.draw((ctx, w, h) => drawLabel(ctx, w, h, s.glyph, {
        bg: s.pressed ? '#9fe8bd' : '#e6e0cb',
        font: `bold 110px 'Consolas', serif`
      }));
    });
  }

  function pressAnim(glyph) {
    const c = caps.find((x) => x.glyph === glyph);
    if (c) c.anim = 1;
  }

  function tick(dt) {
    for (const c of caps) {
      if (c.anim > 0) {
        c.anim = Math.max(0, c.anim - dt * 6);
        c.cap.position.y = c.baseY - Math.sin(c.anim * Math.PI) * 0.012;
      }
    }
  }

  // wrap send so every press also triggers the dip animation
  caps.forEach((c) => {
    c.cap.userData.onClick = () => {
      pressAnim(c.glyph);
      send({ type: 'press', glyph: c.glyph });
    };
  });

  update(view);
  return { group, update, tick };
}

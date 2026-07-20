/** Logic Grid — CRT question + table clipboard (always present) + answer bars. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CanvasTex, displayMaterial, labelMaterial, drawWrapped, drawLabel } from '../textUtil.js';

export function build({ view, send }) {
  const group = new THREE.Group();
  let lastView = view;

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

  /* ---- Clipboard always on the table when this module is present ---- */
  const clipboard = new THREE.Group();
  clipboard.name = 'logicgrid-clipboard';
  clipboard.position.set(0.58, 0.005, 0.52);
  clipboard.rotation.y = -0.35;

  const boardMat = new THREE.MeshStandardMaterial({ color: 0x2c2418, roughness: 0.75, metalness: 0.08 });
  const board = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.01, 0.34, 2, 0.006), boardMat);
  board.position.y = 0.005;
  board.castShadow = true;
  board.receiveShadow = true;
  clipboard.add(board);

  const clipMat = new THREE.MeshStandardMaterial({ color: 0x9aa3b0, roughness: 0.35, metalness: 0.85 });
  const clipBase = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.012, 0.035), clipMat);
  clipBase.position.set(0, 0.016, -0.145);
  clipBase.castShadow = true;
  clipboard.add(clipBase);
  const clipArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.006, 0.05), clipMat);
  clipArm.position.set(0, 0.022, -0.12);
  clipArm.rotation.x = 0.15;
  clipboard.add(clipArm);
  const clipSpring = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.04, 10), clipMat);
  clipSpring.rotation.z = Math.PI / 2;
  clipSpring.position.set(0, 0.02, -0.145);
  clipboard.add(clipSpring);

  const noteTex = new CanvasTex(768, 1024);
  const paperMat = new THREE.MeshStandardMaterial({
    map: noteTex.texture,
    roughness: 0.85,
    metalness: 0.0
  });
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.29), paperMat);
  paper.rotation.x = -Math.PI / 2;
  paper.position.set(0, 0.012, 0.01);
  paper.receiveShadow = true;
  clipboard.add(paper);

  function advanceNote() {
    if ((lastView.clues || []).length > 1) send({ type: 'nextClue' });
  }

  // Click paper or board to flip to the next intercepted note
  paper.userData.onClick = advanceNote;
  paper.userData.highlightTargets = [paper, board];
  board.userData.onClick = advanceNote;
  board.userData.highlightTargets = [paper, board];

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

  function paintNote(v) {
    const clues = v.clues || [];
    const idx = v.clueIndex || 0;
    noteTex.draw((ctx, w, h) => {
      ctx.fillStyle = '#f2ead8';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(140, 120, 90, 0.1)';
      for (let i = 0; i < 28; i++) {
        const x = ((i * 97) % (w - 20)) + 10;
        const y = ((i * 53) % (h - 20)) + 10;
        ctx.fillRect(x, y, 3 + (i % 5), 1);
      }
      ctx.strokeStyle = '#c5d0e0';
      ctx.lineWidth = 2;
      for (let y = 140; y < h - 80; y += 44) {
        ctx.beginPath();
        ctx.moveTo(48, y);
        ctx.lineTo(w - 48, y);
        ctx.stroke();
      }
      ctx.strokeStyle = '#d09090';
      ctx.beginPath();
      ctx.moveTo(72, 100);
      ctx.lineTo(72, h - 60);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000000';

      if (!clues.length) {
        ctx.font = `bold 42px 'Consolas', monospace`;
        ctx.fillText('NO INTERCEPTED NOTES', w / 2, h / 2);
        return;
      }

      ctx.font = `bold 36px 'Consolas', monospace`;
      ctx.fillText(`INTERCEPTED NOTE  ${idx + 1} / ${clues.length}`, w / 2, 70);

      const pad = 88;
      const box = { x: pad, y: 130, w: w - pad * 2, h: h - 220 };
      drawWrappedInBox(ctx, box, clues[idx], { color: '#000000', size: 44 });

      if (clues.length > 1) {
        ctx.font = `bold 24px 'Consolas', monospace`;
        ctx.fillStyle = '#000000';
        ctx.fillText('TAP CLIPBOARD FOR NEXT NOTE', w / 2, h - 40);
      }
    });
  }

  function drawWrappedInBox(ctx, box, text, { color, size }) {
    let fontSize = size;
    const words = String(text).split(' ');
    for (let attempt = 0; attempt < 8; attempt++) {
      ctx.font = `bold ${fontSize}px 'Consolas', monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = color;
      const lines = [];
      let line = '';
      for (const word of words) {
        const tryLine = line ? `${line} ${word}` : word;
        if (ctx.measureText(tryLine).width > box.w && line) {
          lines.push(line);
          line = word;
        } else {
          line = tryLine;
        }
      }
      if (line) lines.push(line);
      const lineH = fontSize * 1.35;
      const totalH = lines.length * lineH;
      if (totalH <= box.h || fontSize <= 26) {
        lines.forEach((l, i) => ctx.fillText(l, box.x, box.y + i * lineH));
        return;
      }
      fontSize -= 3;
    }
  }

  function update(v) {
    lastView = v;
    qTex.draw((ctx, w, h) => drawWrapped(ctx, w, h, v.question || 'STANDBY', { size: 36 }));
    paintNote(v);

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
  return { group, update, tableProp: clipboard };
}

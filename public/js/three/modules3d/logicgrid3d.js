/** Logic Grid — CRT question + table clipboard (all notes, high-contrast) + answer bars. */
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

  /* ---- Clipboard always on the table; shows every intercepted note ---- */
  const clipboard = new THREE.Group();
  clipboard.name = 'logicgrid-clipboard';
  clipboard.position.set(0.62, 0.005, 0.55);
  clipboard.rotation.y = -0.35;

  const boardMat = new THREE.MeshStandardMaterial({ color: 0x2c2418, roughness: 0.75, metalness: 0.08 });
  const board = new THREE.Mesh(new RoundedBoxGeometry(0.30, 0.01, 0.42, 2, 0.006), boardMat);
  board.position.y = 0.005;
  board.castShadow = true;
  board.receiveShadow = true;
  clipboard.add(board);

  const clipMat = new THREE.MeshStandardMaterial({ color: 0x9aa3b0, roughness: 0.35, metalness: 0.85 });
  const clipBase = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.014, 0.038), clipMat);
  clipBase.position.set(0, 0.018, -0.185);
  clipBase.castShadow = true;
  clipboard.add(clipBase);
  const clipArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.007, 0.048), clipMat);
  clipArm.position.set(0, 0.026, -0.158);
  clipArm.rotation.x = 0.12;
  clipboard.add(clipArm);

  // Higher-res paper; MeshBasicMaterial so scene lights don't wash out black text
  const noteTex = new CanvasTex(1024, 1408);
  const paperMat = new THREE.MeshBasicMaterial({
    map: noteTex.texture,
    toneMapped: false
  });
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.36), paperMat);
  paper.rotation.x = -Math.PI / 2;
  // Sit fully under the clip (top of paper below clip arm)
  paper.position.set(0, 0.012, 0.02);
  clipboard.add(paper);

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

  function wrapLines(ctx, text, maxWidth) {
    const words = String(text).split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const tryLine = line ? `${line} ${word}` : word;
      if (ctx.measureText(tryLine).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = tryLine;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function paintNote(v) {
    const clues = v.clues || [];
    noteTex.draw((ctx, w, h) => {
      // Bright white paper for max contrast
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold 40px 'Consolas', monospace`;
      ctx.fillText('INTERCEPTED NOTES', w / 2, 48);

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(48, 72);
      ctx.lineTo(w - 48, 72);
      ctx.stroke();

      if (!clues.length) {
        ctx.font = `bold 36px 'Consolas', monospace`;
        ctx.fillText('NO INTERCEPTED NOTES', w / 2, h / 2);
        return;
      }

      // Fit all clues: shrink type if the list is long
      let bodySize = 34;
      let lineH = bodySize * 1.35;
      const left = 56;
      const maxW = w - left * 2;
      const top = 100;
      const bottom = h - 36;
      const available = bottom - top;

      const layout = () => {
        ctx.font = `bold ${bodySize}px 'Consolas', monospace`;
        const blocks = clues.map((c, i) => wrapLines(ctx, `${i + 1}. ${c}`, maxW));
        let total = 0;
        for (const lines of blocks) total += lines.length * lineH + bodySize * 0.35;
        return { blocks, total };
      };

      let { blocks, total } = layout();
      while (total > available && bodySize > 22) {
        bodySize -= 2;
        lineH = bodySize * 1.35;
        ({ blocks, total } = layout());
      }

      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#000000';
      let y = top;
      blocks.forEach((lines) => {
        ctx.font = `bold ${bodySize}px 'Consolas', monospace`;
        for (const line of lines) {
          ctx.fillText(line, left, y);
          y += lineH;
        }
        y += bodySize * 0.35;
      });
    });
  }

  function update(v) {
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

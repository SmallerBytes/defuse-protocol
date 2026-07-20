/** Logic Grid — CRT question + READ NOTE popup + answer bars. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CanvasTex, displayMaterial, labelMaterial, drawWrapped, drawLabel } from '../textUtil.js';

export function build({ view, send }) {
  const group = new THREE.Group();
  let noteOpen = false;
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

  // Large popup: hidden until the Defuser presses READ NOTE (no 3D frame — avoids clipping slab)
  const noteTex = new CanvasTex(768, 448);
  const notePanel = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.198), displayMaterial(noteTex));
  notePanel.position.set(0, 0.19, -0.02);
  notePanel.rotation.x = -0.12;
  notePanel.visible = false;
  notePanel.renderOrder = 2;
  group.add(notePanel);

  const btnTex = new CanvasTex(256, 80);
  const btnSide = new THREE.MeshStandardMaterial({ color: 0x1e4a32, roughness: 0.5, metalness: 0.2 });
  const noteBtn = new THREE.Mesh(
    new RoundedBoxGeometry(0.12, 0.02, 0.036, 2, 0.004),
    [btnSide, btnSide, labelMaterial(btnTex), btnSide, btnSide, btnSide]
  );
  noteBtn.castShadow = true;
  noteBtn.userData.highlightTargets = [noteBtn];
  group.add(noteBtn);

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
    if (!clues.length) {
      noteTex.draw((ctx, w, h) => {
        ctx.fillStyle = '#06120c';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#3a6a50';
        ctx.lineWidth = 8;
        ctx.strokeRect(4, 4, w - 8, h - 8);
        ctx.font = `bold 36px 'Consolas', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#9fe8bd';
        ctx.fillText('NO INTERCEPTED NOTES', w / 2, h / 2);
      });
      return;
    }
    const header = `INTERCEPTED NOTE  ${idx + 1} / ${clues.length}`;
    const body = clues[idx];
    noteTex.draw((ctx, w, h) => {
      ctx.fillStyle = '#06120c';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#3a6a50';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, w - 8, h - 8);
      ctx.fillStyle = '#1a3a28';
      ctx.fillRect(8, 8, w - 16, 56);
      ctx.font = `bold 32px 'Consolas', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#7dcea0';
      ctx.fillText(header, w / 2, 36);
      const pad = 24;
      const box = { x: pad, y: 80, w: w - pad * 2, h: h - 80 - pad };
      ctx.save();
      ctx.beginPath();
      ctx.rect(box.x, box.y, box.w, box.h);
      ctx.clip();
      drawWrappedInBox(ctx, box, body, { color: '#c8f5d8', size: 40 });
      ctx.restore();
      ctx.font = `bold 22px 'Consolas', monospace`;
      ctx.fillStyle = '#5a8a70';
      ctx.fillText(clues.length > 1 ? 'PRESS AGAIN FOR NEXT NOTE' : 'PRESS AGAIN TO CLOSE', w / 2, h - 22);
    });
  }

  function drawWrappedInBox(ctx, box, text, { color, size }) {
    let fontSize = size;
    const words = String(text).split(' ');
    for (let attempt = 0; attempt < 6; attempt++) {
      ctx.font = `bold ${fontSize}px 'Consolas', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
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
      const lineH = fontSize * 1.3;
      const totalH = lines.length * lineH;
      if (totalH <= box.h || fontSize <= 24) {
        const y0 = box.y + box.h / 2 - ((lines.length - 1) * lineH) / 2;
        lines.forEach((l, i) => ctx.fillText(l, box.x + box.w / 2, y0 + i * lineH));
        return;
      }
      fontSize -= 4;
    }
  }

  function setNoteVisible(open) {
    noteOpen = open;
    notePanel.visible = open;
    if (open) {
      // Beside the popup on the right
      noteBtn.position.set(0.22, 0.19, -0.02);
      noteBtn.rotation.x = -0.12;
    } else {
      // Right of the CRT question housing
      noteBtn.position.set(0.155, 0.055, -0.06);
      noteBtn.rotation.x = 0;
    }
    btnTex.draw((ctx, w, h) => drawLabel(ctx, w, h, open ? 'NEXT ▶' : 'READ NOTE', {
      bg: open ? '#cfd6e4' : '#9fe8bd',
      font: `bold 34px 'Consolas', monospace`
    }));
  }

  noteBtn.userData.onClick = () => {
    if (!noteOpen) {
      paintNote(lastView);
      setNoteVisible(true);
      return;
    }
    const clues = lastView.clues || [];
    if (clues.length <= 1) {
      setNoteVisible(false);
      return;
    }
    send({ type: 'nextClue' });
  };

  function update(v) {
    lastView = v;
    qTex.draw((ctx, w, h) => drawWrapped(ctx, w, h, v.question || 'STANDBY', { size: 36 }));
    if (noteOpen) paintNote(v);

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

  setNoteVisible(false);
  update(view);
  return { group, update };
}

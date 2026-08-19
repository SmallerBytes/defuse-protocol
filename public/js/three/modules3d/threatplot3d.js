/** Threat Plot — radar scope grid (jet, SAMs, target, tanker) + N/E/S/W D-pad. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CanvasTex, displayMaterial, labelMaterial, drawLabel } from '../textUtil.js';

const COL_LETTERS = 'ABCDEFGH';
function cellName(x, y) {
  return `${COL_LETTERS[x]}${y + 1}`;
}

export function build({ view, send }) {
  const group = new THREE.Group();

  const housing = new THREE.Mesh(new RoundedBoxGeometry(0.27, 0.05, 0.19, 3, 0.01),
    new THREE.MeshStandardMaterial({ color: 0x1d2129, roughness: 0.45, metalness: 0.35 }));
  housing.position.set(0, 0.025, -0.048);
  housing.rotation.x = 0.14;
  housing.castShadow = true;
  group.add(housing);

  const scopeTex = new CanvasTex(640, 640);
  const scope = new THREE.Mesh(new THREE.PlaneGeometry(0.235, 0.165), displayMaterial(scopeTex));
  scope.rotation.x = -Math.PI / 2 + 0.14;
  scope.position.set(0, 0.0515, -0.047);
  group.add(scope);

  // D-pad
  const padGeo = new RoundedBoxGeometry(0.04, 0.018, 0.036, 2, 0.005);
  const padDefs = [
    ['N', 0, 0.048],
    ['W', -0.052, 0.091],
    ['E', 0.052, 0.091],
    ['S', 0, 0.134]
  ];
  for (const [dir, x, z] of padDefs) {
    const tex = new CanvasTex(96, 96);
    tex.draw((ctx, w, h) => drawLabel(ctx, w, h, dir, { bg: '#cfd6e4' }));
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x32384a, roughness: 0.55, metalness: 0.2 });
    const btn = new THREE.Mesh(padGeo, [sideMat, sideMat, labelMaterial(tex), sideMat, sideMat, sideMat]);
    btn.position.set(x, 0.009, z);
    btn.castShadow = true;
    btn.userData.onClick = () => send({ type: 'step', dir });
    btn.userData.highlightTargets = [btn];
    group.add(btn);
  }

  function parse(cell) {
    return { x: COL_LETTERS.indexOf(cell[0]), y: Number(cell.slice(1)) - 1 };
  }

  function paintScope(v) {
    scopeTex.draw((ctx, w, h) => {
      ctx.fillStyle = '#050f08';
      ctx.fillRect(0, 0, w, h);

      const n = v.size;
      const labelBand = 44;
      const statusBand = 56;
      const gridTop = labelBand;
      const gridBottom = h - statusBand;
      const cell = Math.min((w - labelBand * 2) / n, (gridBottom - gridTop) / n);
      const gx = (w - cell * n) / 2;

      // grid
      ctx.strokeStyle = '#1d5c33';
      ctx.lineWidth = 2;
      for (let i = 0; i <= n; i++) {
        ctx.beginPath(); ctx.moveTo(gx + i * cell, gridTop); ctx.lineTo(gx + i * cell, gridTop + cell * n); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(gx, gridTop + i * cell); ctx.lineTo(gx + cell * n, gridTop + i * cell); ctx.stroke();
      }

      // axis labels
      ctx.fillStyle = '#39d98a';
      ctx.font = `bold 26px 'Consolas', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < n; i++) {
        ctx.fillText(COL_LETTERS[i], gx + (i + 0.5) * cell, gridTop - 22);
        ctx.fillText(String(i + 1), gx - 24, gridTop + (i + 0.5) * cell);
      }

      const cx = (x) => gx + (x + 0.5) * cell;
      const cy = (y) => gridTop + (y + 0.5) * cell;

      // start marker
      const st = parse(v.start);
      ctx.strokeStyle = '#8fa8bf';
      ctx.lineWidth = 3;
      ctx.strokeRect(cx(st.x) - cell * 0.28, cy(st.y) - cell * 0.28, cell * 0.56, cell * 0.56);

      // SAM sites (type visible; coverage is NOT — that lives in the manual)
      for (const sam of v.sams) {
        const s = parse(sam.cell);
        ctx.fillStyle = '#ff5566';
        ctx.beginPath();
        ctx.arc(cx(s.x), cy(s.y), cell * 0.26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.floor(cell * 0.3)}px 'Consolas', monospace`;
        ctx.fillText(sam.type.replace('SA-', ''), cx(s.x), cy(s.y));
      }

      // tanker anchor
      if (v.tanker) {
        const t = parse(v.tanker);
        ctx.fillStyle = '#39d98a';
        ctx.fillRect(cx(t.x) - cell * 0.22, cy(t.y) - cell * 0.22, cell * 0.44, cell * 0.44);
        ctx.fillStyle = '#04130a';
        ctx.font = `bold ${Math.floor(cell * 0.32)}px 'Consolas', monospace`;
        ctx.fillText('T', cx(t.x), cy(t.y));
      }

      // target
      const tg = parse(v.target);
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(cx(tg.x), cy(tg.y), cell * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx(tg.x), cy(tg.y), cell * 0.32, 0, Math.PI * 2);
      ctx.stroke();

      // jet (triangle)
      const p = parse(v.player);
      ctx.fillStyle = '#7fb4ff';
      ctx.beginPath();
      ctx.moveTo(cx(p.x), cy(p.y) - cell * 0.3);
      ctx.lineTo(cx(p.x) - cell * 0.24, cy(p.y) + cell * 0.24);
      ctx.lineTo(cx(p.x) + cell * 0.24, cy(p.y) + cell * 0.24);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#cfe4ff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // status strip
      ctx.fillStyle = '#0a1c10';
      ctx.fillRect(0, h - statusBand, w, statusBand);
      ctx.fillStyle = '#9fe8bd';
      ctx.font = `bold 28px 'Consolas', monospace`;
      ctx.textAlign = 'left';
      const tankerNote = v.tanker ? (v.refueled ? ' · REFUELED' : ` · TANKER ${v.tanker}`) : '';
      ctx.fillText(`JET ${v.player}  TGT ${v.target}${tankerNote}`, 16, h - statusBand / 2);
    });
  }

  function update(v) {
    paintScope(v);
  }

  update(view);
  return { group, update };
}

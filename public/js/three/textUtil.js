/**
 * Canvas-texture helpers for labels, displays, and engravings on 3D
 * geometry. These are surface decals on real meshes (keycap legends,
 * emissive readouts), not flat UI panels.
 */
import * as THREE from 'three';

/** A redrawable canvas-backed texture. */
export class CanvasTex {
  constructor(w = 256, h = 128) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
  }

  draw(fn) {
    fn(this.ctx, this.canvas.width, this.canvas.height);
    this.texture.needsUpdate = true;
    return this;
  }
}

/** Self-lit screen material (LED/LCD readouts). */
export function displayMaterial(canvasTex) {
  return new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: 0xffffff,
    emissiveMap: canvasTex.texture,
    emissiveIntensity: 1.4,
    roughness: 0.35,
    metalness: 0.1
  });
}

/** Printed-label material (keycap legends, engraved plates). */
export function labelMaterial(canvasTex) {
  return new THREE.MeshStandardMaterial({
    map: canvasTex.texture,
    roughness: 0.55,
    metalness: 0.05
  });
}

/** Draw a glowing readout (dark background, bright text). */
export function drawReadout(ctx, w, h, text, { color = '#39d98a', bg = '#04130a', font = null } = {}) {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.font = font || `bold ${Math.floor(h * 0.62)}px 'Consolas', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = h * 0.12;
  ctx.fillStyle = color;
  ctx.fillText(text, w / 2, h / 2 + h * 0.03);
  ctx.shadowBlur = 0;
}

/** Draw a printed keycap/plate label (light background, dark text). */
export function drawLabel(ctx, w, h, text, { bg = '#e6e0cb', color = '#181818', font = null } = {}) {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  // subtle plastic shading so the print doesn't look like flat UI
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(255,255,255,0.18)');
  grad.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.font = font || `bold ${Math.floor(h * 0.6)}px 'Consolas', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, w / 2, h / 2 + h * 0.04);
}

/** Word-wrapped multi-line readout (logic grid question screen). */
export function drawWrapped(ctx, w, h, text, { color = '#ffd23f', bg = '#120e02', size = 34 } = {}) {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.font = `bold ${size}px 'Consolas', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const tryLine = line ? line + ' ' + word : word;
    if (ctx.measureText(tryLine).width > w * 0.92 && line) {
      lines.push(line);
      line = word;
    } else {
      line = tryLine;
    }
  }
  if (line) lines.push(line);
  const lineH = size * 1.25;
  const y0 = h / 2 - ((lines.length - 1) * lineH) / 2;
  lines.forEach((l, i) => ctx.fillText(l, w / 2, y0 + i * lineH));
}

/**
 * In-VR pause prompt: SETTINGS / MAIN MENU / RESUME.
 * Opened with the left Quest Y button.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CanvasTex, displayMaterial, labelMaterial, drawLabel } from './textUtil.js';

const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _fwd = new THREE.Vector3();
const _dollyQuat = new THREE.Quaternion();

function makeFace(w, h, canvasW, canvasH, draw) {
  const tex = new CanvasTex(canvasW, canvasH);
  tex.draw(draw);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), displayMaterial(tex));
  return mesh;
}

function makeButton(label, w, h, bg, color) {
  const tex = new CanvasTex(512, 128);
  tex.draw((ctx, cw, ch) => drawLabel(ctx, cw, ch, label, {
    bg,
    color,
    font: `bold ${Math.floor(ch * 0.52)}px 'Consolas', monospace`
  }));
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), labelMaterial(tex));
  mesh.userData.onClick = null;
  mesh.userData.highlightTargets = [mesh];
  return mesh;
}

export function createPauseMenu({ onResume, onSettings, onMainMenu }) {
  const group = new THREE.Group();
  group.visible = false;
  group.renderOrder = 10;

  const bezel = new THREE.Mesh(
    new RoundedBoxGeometry(0.42, 0.34, 0.02, 3, 0.012),
    new THREE.MeshStandardMaterial({ color: 0x161a22, roughness: 0.55, metalness: 0.25 })
  );
  group.add(bezel);

  const title = makeFace(0.38, 0.05, 768, 128, (ctx, w, h) => {
    ctx.fillStyle = '#0c1016';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#39d98a';
    ctx.font = `bold ${Math.floor(h * 0.58)}px 'Consolas', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', w / 2, h / 2 + 4);
  });
  title.position.set(0, 0.12, 0.012);
  group.add(title);

  const resumeBtn = makeButton('RESUME', 0.36, 0.055, '#2f8a4a', '#f2f6f3');
  resumeBtn.position.set(0, 0.042, 0.012);
  resumeBtn.userData.onClick = () => onResume && onResume();
  group.add(resumeBtn);

  const settingsBtn = makeButton('SETTINGS', 0.36, 0.055, '#cfd6e4', '#12151b');
  settingsBtn.position.set(0, -0.028, 0.012);
  settingsBtn.userData.onClick = () => onSettings && onSettings();
  group.add(settingsBtn);

  const menuBtn = makeButton('MAIN MENU', 0.36, 0.055, '#c43240', '#f7ecec');
  menuBtn.position.set(0, -0.098, 0.012);
  menuBtn.userData.onClick = () => onMainMenu && onMainMenu();
  group.add(menuBtn);

  const hint = makeFace(0.38, 0.032, 768, 80, (ctx, w, h) => {
    ctx.fillStyle = '#161a22';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#8b93a4';
    ctx.font = `bold ${Math.floor(h * 0.5)}px 'Consolas', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Y TO CLOSE', w / 2, h / 2 + 2);
  });
  hint.position.set(0, -0.145, 0.012);
  group.add(hint);

  const targets = [resumeBtn, settingsBtn, menuBtn];

  return {
    group,
    targets,
    get open() {
      return group.visible;
    },
    show(camera, dolly) {
      camera.updateMatrixWorld();
      dolly.updateMatrixWorld();
      camera.getWorldPosition(_pos);
      camera.getWorldQuaternion(_quat);
      _fwd.set(0, 0, -1).applyQuaternion(_quat);
      group.position.copy(_pos).addScaledVector(_fwd, 0.82);
      group.position.y = _pos.y - 0.04;
      group.quaternion.copy(_quat);
      dolly.worldToLocal(group.position);
      dolly.getWorldQuaternion(_dollyQuat);
      group.quaternion.copy(_dollyQuat.invert().multiply(_quat));
      group.visible = true;
    },
    hide() {
      group.visible = false;
    }
  };
}

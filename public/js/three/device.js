/**
 * THE DEVICE — a physical 3D bomb: rounded metal case, protruding module
 * faceplates, timer assembly, strike LEDs, engraved serial plate.
 * Owns per-module 3D builders and their live updates.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { moduleBuilders } from './modules3d/index.js';
import { CanvasTex, displayMaterial, labelMaterial, drawReadout, drawLabel } from './textUtil.js';

const CASE_W = 1.14, CASE_H = 0.16, CASE_D = 0.8;
const SLOT = 0.3, PLATE_H = 0.024;
const COLS = [-0.36, 0, 0.36];
const ROWS = [-0.195, 0.195];
const TIMER_SLOT = 1; // back row, middle

const caseMat = new THREE.MeshStandardMaterial({ color: 0x4a505c, metalness: 0.85, roughness: 0.38 });
const plateMat = new THREE.MeshStandardMaterial({ color: 0x262b35, metalness: 0.4, roughness: 0.5 });
const blankMat = new THREE.MeshStandardMaterial({ color: 0x3a404d, metalness: 0.6, roughness: 0.45 });
const rivetMat = new THREE.MeshStandardMaterial({ color: 0x9aa0ad, metalness: 0.95, roughness: 0.3 });

function slotPos(i) {
  return { x: COLS[i % 3], z: ROWS[Math.floor(i / 3)] };
}

export class Device {
  /** @param {object} payload defuser game payload  @param {function} send (moduleId, action) => void */
  constructor(payload, send) {
    this.group = new THREE.Group();
    this.entries = new Map();
    this.over = false;
    this.maxStrikes = payload.maxStrikes;
    this._lastTimerText = null;

    this._buildCase(payload.serial);
    this._buildTimer(payload.timeMs, payload.maxStrikes, payload.strikes);

    const slots = payload.modules.length <= 3 ? [0, 2, 4] : [0, 2, 3, 4, 5];
    payload.modules.forEach((mod, i) => {
      this._buildModuleBay(mod, slots[i], (action) => send(mod.id, action));
    });
    // blank cover plates over unused bays
    const used = new Set([TIMER_SLOT, ...slots.slice(0, payload.modules.length)]);
    for (let i = 0; i < 6; i++) {
      if (!used.has(i)) this._buildBlank(i);
    }

    // collect raycast targets once (onClick may be toggled at runtime)
    this.targets = [];
    this.group.traverse((o) => {
      if (o.userData && ('onClick' in o.userData)) this.targets.push(o);
    });
  }

  /* ---------- construction ---------- */

  _buildCase(serial) {
    const body = new THREE.Mesh(new RoundedBoxGeometry(CASE_W, CASE_H, CASE_D, 4, 0.025), caseMat);
    body.position.y = CASE_H / 2;
    body.castShadow = body.receiveShadow = true;
    this.group.add(body);

    // corner rivets
    const rivetGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.006, 12);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const rivet = new THREE.Mesh(rivetGeo, rivetMat);
      rivet.position.set(sx * (CASE_W / 2 - 0.04), CASE_H + 0.002, sz * (CASE_D / 2 - 0.04));
      this.group.add(rivet);
    }

    // carry handle on the left face
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x1c1e24, roughness: 0.7 });
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.22, 12), handleMat);
    grip.rotation.x = Math.PI / 2;
    grip.position.set(-CASE_W / 2 - 0.05, CASE_H * 0.55, 0);
    const armGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.06, 8);
    for (const sz of [-1, 1]) {
      const arm = new THREE.Mesh(armGeo, handleMat);
      arm.rotation.z = Math.PI / 2;
      arm.position.set(-CASE_W / 2 - 0.025, CASE_H * 0.55, sz * 0.1);
      this.group.add(arm);
    }
    grip.castShadow = true;
    this.group.add(grip);

    // engraved serial plate on the front face
    const tex = new CanvasTex(384, 112);
    tex.draw((ctx, w, h) => drawLabel(ctx, w, h, `SN ${serial}`, {
      bg: '#b9b3a0', color: '#2c2c28', font: `bold 56px 'Consolas', monospace`
    }));
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x8d8775, metalness: 0.6, roughness: 0.5 });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.008),
      [sideMat, sideMat, sideMat, sideMat, labelMaterial(tex), sideMat]);
    plate.position.set(0, CASE_H * 0.5, CASE_D / 2 + 0.002);
    this.group.add(plate);
  }

  _buildTimer(timeMs, maxStrikes, strikes) {
    const { x, z } = slotPos(TIMER_SLOT);
    const bay = new THREE.Group();
    bay.position.set(x, CASE_H, z);

    const housing = new THREE.Mesh(new RoundedBoxGeometry(SLOT, 0.06, SLOT, 3, 0.012),
      new THREE.MeshStandardMaterial({ color: 0x14161c, metalness: 0.5, roughness: 0.4 }));
    housing.position.y = 0.03;
    housing.castShadow = true;
    bay.add(housing);

    this.timerTex = new CanvasTex(512, 224);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.115), displayMaterial(this.timerTex));
    screen.rotation.x = -Math.PI / 2;
    screen.position.set(0, 0.0615, -0.045);
    bay.add(screen);

    // strike LED row
    this.strikeLeds = [];
    const ledGeo = new THREE.SphereGeometry(0.011, 12, 10);
    const x0 = -((maxStrikes - 1) / 2) * 0.05;
    for (let i = 0; i < maxStrikes; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x1c0d0f, emissive: 0xff2233, emissiveIntensity: 0, roughness: 0.3
      });
      const led = new THREE.Mesh(ledGeo, mat);
      led.position.set(x0 + i * 0.05, 0.065, 0.095);
      bay.add(led);
      this.strikeLeds.push(mat);
    }

    this.group.add(bay);
    this.setTimer(timeMs, true);
    this.setStrikes(strikes || 0);
  }

  _buildModuleBay(mod, slot, send) {
    const { x, z } = slotPos(slot);
    const bay = new THREE.Group();
    bay.position.set(x, CASE_H, z);

    const plate = new THREE.Mesh(new RoundedBoxGeometry(SLOT, PLATE_H, SLOT, 2, 0.008), plateMat);
    plate.position.y = PLATE_H / 2;
    plate.castShadow = plate.receiveShadow = true;
    bay.add(plate);

    // status LED in the corner
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x101216, emissive: 0x39d98a, emissiveIntensity: 0, roughness: 0.3
    });
    const led = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.012, 10), ledMat);
    led.position.set(0.128, PLATE_H + 0.004, -0.128);
    bay.add(led);

    const builderFn = moduleBuilders[mod.type];
    const builder = builderFn ? builderFn({ view: mod.view, send }) : null;
    if (builder) {
      builder.group.position.y = PLATE_H;
      bay.add(builder.group);
      // Optional prop seated on the table (e.g. Logic Grid clipboard), not in the bay
      if (builder.tableProp) this.group.add(builder.tableProp);
    }

    this.group.add(bay);
    this.entries.set(mod.id, { builder, ledMat, bay, solved: !!mod.solved });
    if (mod.solved) this.markSolved(mod.id);
  }

  _buildBlank(slot) {
    const { x, z } = slotPos(slot);
    const plate = new THREE.Mesh(new RoundedBoxGeometry(SLOT, PLATE_H * 0.6, SLOT, 2, 0.008), blankMat);
    plate.position.set(x, CASE_H + PLATE_H * 0.3, z);
    plate.receiveShadow = true;
    this.group.add(plate);
  }

  /* ---------- live updates ---------- */

  updateModule(id, view) {
    const e = this.entries.get(id);
    if (e && e.builder) e.builder.update(view);
  }

  markSolved(id) {
    const e = this.entries.get(id);
    if (!e) return;
    e.solved = true;
    e.ledMat.emissiveIntensity = 1.8;
  }

  setTimer(ms, force = false) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const text = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
    if (!force && text === this._lastTimerText) return;
    this._lastTimerText = text;
    const color = this.over ? (this.won ? '#39d98a' : '#ff2233') : (ms < 60000 ? '#ff4d5e' : '#39d98a');
    this.timerTex.draw((ctx, w, h) =>
      drawReadout(ctx, w, h, this.over ? (this.won ? 'SAFE' : 'BOOM') : text,
        { color, font: `bold 130px 'Consolas', monospace` }));
  }

  setStrikes(n) {
    this.strikeLeds.forEach((mat, i) => { mat.emissiveIntensity = i < n ? 2.2 : 0; });
  }

  gameOver(won) {
    this.over = true;
    this.won = won;
    this.setTimer(0, true);
    if (won) for (const e of this.entries.values()) e.ledMat.emissiveIntensity = 1.8;
  }

  tick(dt, t) {
    for (const e of this.entries.values()) {
      if (e.builder && e.builder.tick) e.builder.tick(dt, t, e.solved || this.over);
    }
  }
}

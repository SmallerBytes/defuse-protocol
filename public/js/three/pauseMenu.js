/**
 * In-VR pause + settings. Opens on left Quest Y, parked above that
 * controller so you can point at it with the other hand.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CanvasTex, displayMaterial, labelMaterial, drawLabel } from './textUtil.js';

const DIFFS = [
  { key: 'easy', label: 'EASY' },
  { key: 'normal', label: 'MED' },
  { key: 'hard', label: 'HARD' }
];

function fmtTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function nearestIndex(list, value) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < list.length; i++) {
    const d = Math.abs(list[i] - value);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function stepList(list, value, dir) {
  const i = nearestIndex(list, value);
  return list[Math.max(0, Math.min(list.length - 1, i + dir))];
}

function makeFace(w, h, canvasW, canvasH, draw) {
  const tex = new CanvasTex(canvasW, canvasH);
  tex.draw(draw);
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), displayMaterial(tex));
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

function makeValue(w, h) {
  const tex = new CanvasTex(256, 80);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), displayMaterial(tex));
  return {
    mesh,
    set(text) {
      tex.draw((ctx, cw, ch) => {
        ctx.fillStyle = '#0c1016';
        ctx.fillRect(0, 0, cw, ch);
        ctx.fillStyle = '#e8edf5';
        ctx.font = `bold ${Math.floor(ch * 0.62)}px 'Consolas', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, cw / 2, ch / 2 + 2);
      });
    }
  };
}

export function createPauseMenu({ onResume, onMainMenu, getSettings, setSettings }) {
  const group = new THREE.Group();
  group.visible = false;
  group.renderOrder = 40;

  let page = 'pause';
  const pausePage = new THREE.Group();
  const settingsPage = new THREE.Group();
  group.add(pausePage, settingsPage);

  const pauseBezel = new THREE.Mesh(
    new RoundedBoxGeometry(0.24, 0.2, 0.02, 3, 0.008),
    new THREE.MeshBasicMaterial({ color: 0x0b0e14 })
  );
  pausePage.add(pauseBezel);
  const pauseBack = new THREE.Mesh(
    new THREE.PlaneGeometry(0.255, 0.215),
    new THREE.MeshBasicMaterial({ color: 0x0b0e14, side: THREE.DoubleSide })
  );
  pauseBack.position.z = -0.011;
  pausePage.add(pauseBack);

  const pauseTitle = makeFace(0.21, 0.03, 640, 96, (ctx, w, h) => {
    ctx.fillStyle = '#0c1016';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#39d98a';
    ctx.font = `bold ${Math.floor(h * 0.58)}px 'Consolas', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', w / 2, h / 2 + 3);
  });
  pauseTitle.position.set(0, 0.07, 0.008);
  pausePage.add(pauseTitle);

  const resumeBtn = makeButton('RESUME', 0.2, 0.032, '#2f8a4a', '#f2f6f3');
  resumeBtn.position.set(0, 0.026, 0.008);
  resumeBtn.userData.onClick = () => onResume && onResume();
  pausePage.add(resumeBtn);

  const settingsBtn = makeButton('SETTINGS', 0.2, 0.032, '#cfd6e4', '#12151b');
  settingsBtn.position.set(0, -0.012, 0.008);
  settingsBtn.userData.onClick = () => setPage('settings');
  pausePage.add(settingsBtn);

  const menuBtn = makeButton('MAIN MENU', 0.2, 0.032, '#c43240', '#f7ecec');
  menuBtn.position.set(0, -0.05, 0.008);
  menuBtn.userData.onClick = () => onMainMenu && onMainMenu();
  pausePage.add(menuBtn);

  const pauseHint = makeFace(0.21, 0.02, 640, 64, (ctx, w, h) => {
    ctx.fillStyle = '#161a22';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#8b93a4';
    ctx.font = `bold ${Math.floor(h * 0.5)}px 'Consolas', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Y TO CLOSE', w / 2, h / 2 + 2);
  });
  pauseHint.position.set(0, -0.082, 0.008);
  pausePage.add(pauseHint);

  const settingsBezel = new THREE.Mesh(
    new RoundedBoxGeometry(0.3, 0.26, 0.02, 3, 0.008),
    new THREE.MeshBasicMaterial({ color: 0x0b0e14 })
  );
  settingsPage.add(settingsBezel);
  const settingsBack = new THREE.Mesh(
    new THREE.PlaneGeometry(0.315, 0.275),
    new THREE.MeshBasicMaterial({ color: 0x0b0e14, side: THREE.DoubleSide })
  );
  settingsBack.position.z = -0.011;
  settingsPage.add(settingsBack);

  const settingsTitle = makeFace(0.27, 0.028, 768, 96, (ctx, w, h) => {
    ctx.fillStyle = '#0c1016';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#39d98a';
    ctx.font = `bold ${Math.floor(h * 0.55)}px 'Consolas', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SETTINGS', w / 2, h / 2 + 3);
  });
  settingsTitle.position.set(0, 0.105, 0.008);
  settingsPage.add(settingsTitle);

  const colHead = makeFace(0.27, 0.018, 768, 56, (ctx, w, h) => {
    ctx.fillStyle = '#161a22';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#8b93a4';
    ctx.font = `bold ${Math.floor(h * 0.55)}px 'Consolas', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TIME', w * 0.42, h / 2 + 1);
    ctx.fillText('STR', w * 0.78, h / 2 + 1);
  });
  colHead.position.set(0, 0.082, 0.008);
  settingsPage.add(colHead);

  const settingsTargets = [];
  const rows = [];

  function addStep(label, w, h, bg, color, onClick, x, y) {
    const btn = makeButton(label, w, h, bg, color);
    btn.position.set(x, y, 0.008);
    btn.userData.onClick = onClick;
    settingsPage.add(btn);
    settingsTargets.push(btn);
    return btn;
  }

  DIFFS.forEach((diff, i) => {
    const y = 0.052 - i * 0.038;
    const name = makeFace(0.05, 0.024, 160, 64, (ctx, w, h) => {
      ctx.fillStyle = '#161a22';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#cfd6e4';
      ctx.font = `bold ${Math.floor(h * 0.5)}px 'Consolas', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(diff.label, w / 2, h / 2 + 2);
    });
    name.position.set(-0.115, y, 0.008);
    settingsPage.add(name);

    const timeVal = makeValue(0.055, 0.024);
    timeVal.mesh.position.set(-0.02, y, 0.008);
    settingsPage.add(timeVal.mesh);

    const strikeVal = makeValue(0.032, 0.024);
    strikeVal.mesh.position.set(0.1, y, 0.008);
    settingsPage.add(strikeVal.mesh);

    addStep('◀', 0.028, 0.024, '#cfd6e4', '#12151b', () => nudge(diff.key, 'time', -1), -0.062, y);
    addStep('▶', 0.028, 0.024, '#cfd6e4', '#12151b', () => nudge(diff.key, 'time', 1), 0.022, y);
    addStep('◀', 0.028, 0.024, '#cfd6e4', '#12151b', () => nudge(diff.key, 'strikes', -1), 0.068, y);
    addStep('▶', 0.028, 0.024, '#cfd6e4', '#12151b', () => nudge(diff.key, 'strikes', 1), 0.132, y);

    rows.push({ key: diff.key, timeVal, strikeVal });
  });

  const flyVal = makeValue(0.05, 0.024);
  flyVal.mesh.position.set(0.02, -0.068, 0.008);
  settingsPage.add(flyVal.mesh);

  const flyName = makeFace(0.06, 0.024, 160, 64, (ctx, w, h) => {
    ctx.fillStyle = '#161a22';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#cfd6e4';
    ctx.font = `bold ${Math.floor(h * 0.5)}px 'Consolas', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FLY', w / 2, h / 2 + 2);
  });
  flyName.position.set(-0.11, -0.068, 0.008);
  settingsPage.add(flyName);

  addStep('◀', 0.028, 0.024, '#cfd6e4', '#12151b', () => nudgeFly(-1), -0.05, -0.068);
  addStep('▶', 0.028, 0.024, '#cfd6e4', '#12151b', () => nudgeFly(1), 0.062, -0.068);

  const backBtn = makeButton('BACK', 0.12, 0.028, '#cfd6e4', '#12151b');
  backBtn.position.set(-0.07, -0.105, 0.008);
  backBtn.userData.onClick = () => setPage('pause');
  settingsPage.add(backBtn);
  settingsTargets.push(backBtn);

  const settingsResume = makeButton('RESUME', 0.12, 0.028, '#2f8a4a', '#f2f6f3');
  settingsResume.position.set(0.07, -0.105, 0.008);
  settingsResume.userData.onClick = () => onResume && onResume();
  settingsPage.add(settingsResume);
  settingsTargets.push(settingsResume);

  const pauseTargets = [resumeBtn, settingsBtn, menuBtn];

  function readSettings() {
    const s = (getSettings && getSettings()) || {};
    return {
      times: { easy: 8 * 60 * 1000, normal: 10 * 60 * 1000, hard: 12 * 60 * 1000, ...s.times },
      strikes: { easy: 3, normal: 3, hard: 2, ...s.strikes },
      fly: !!s.fly,
      timeOptions: s.timeOptions || [60 * 1000, 8 * 60 * 1000, 10 * 60 * 1000, 12 * 60 * 1000],
      strikeOptions: s.strikeOptions || [1, 2, 3, 4, 5, 6, 7, 8, 9]
    };
  }

  function paintSettings() {
    const s = readSettings();
    for (const row of rows) {
      row.timeVal.set(fmtTime(s.times[row.key]));
      row.strikeVal.set(String(s.strikes[row.key]));
    }
    flyVal.set(s.fly ? 'YES' : 'NO');
  }

  function commit(next) {
    if (setSettings) setSettings(next);
    paintSettings();
  }

  function nudge(key, field, dir) {
    const s = readSettings();
    if (field === 'time') s.times[key] = stepList(s.timeOptions, s.times[key], dir);
    else s.strikes[key] = stepList(s.strikeOptions, s.strikes[key], dir);
    commit(s);
  }

  function nudgeFly(dir) {
    const s = readSettings();
    s.fly = dir > 0;
    commit(s);
  }

  function setPage(next) {
    page = next;
    pausePage.visible = next === 'pause';
    settingsPage.visible = next === 'settings';
    if (next === 'settings') paintSettings();
  }

  setPage('pause');

  group.traverse((o) => {
    if (!o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      m.depthTest = true;
      m.depthWrite = true;
      m.transparent = false;
      m.opacity = 1;
      m.polygonOffset = true;
      m.polygonOffsetFactor = -2;
      m.polygonOffsetUnits = -2;
    }
    o.renderOrder = 40;
  });

  return {
    group,
    get targets() {
      return page === 'settings' ? settingsTargets : pauseTargets;
    },
    get open() {
      return group.visible;
    },
    show() {
      setPage('pause');
      group.visible = true;
    },
    hide() {
      group.visible = false;
      setPage('pause');
    }
  };
}

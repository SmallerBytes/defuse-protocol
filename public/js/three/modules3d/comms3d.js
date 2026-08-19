/** Radio Net — UHF radio: coarse/fine tuning, frequency readout, XMIT key, A–Z letter dial, AUTH. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CanvasTex, displayMaterial, labelMaterial, drawLabel, drawReadout } from '../textUtil.js';

export function build({ view, send }) {
  const group = new THREE.Group();

  /* ---- prompt screen (back, tilted) ---- */
  const housing = new THREE.Mesh(new RoundedBoxGeometry(0.27, 0.05, 0.09, 3, 0.01),
    new THREE.MeshStandardMaterial({ color: 0x1a2330, roughness: 0.5, metalness: 0.35 }));
  housing.position.set(0, 0.025, -0.095);
  housing.rotation.x = 0.18;
  housing.castShadow = true;
  group.add(housing);

  const promptTex = new CanvasTex(768, 200);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.245, 0.066), displayMaterial(promptTex));
  screen.rotation.x = -Math.PI / 2 + 0.18;
  screen.position.set(0, 0.0505, -0.0905);
  group.add(screen);

  /* ---- frequency readout (center-left) ---- */
  const freqTex = new CanvasTex(448, 112);
  const freqScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.115, 0.03), displayMaterial(freqTex));
  freqScreen.rotation.x = -Math.PI / 2;
  freqScreen.position.set(-0.055, 0.0205, 0.01);
  const freqHousing = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.02, 0.042, 2, 0.005),
    new THREE.MeshStandardMaterial({ color: 0x20242c, roughness: 0.5, metalness: 0.3 }));
  freqHousing.position.set(-0.055, 0.01, 0.01);
  freqHousing.castShadow = true;
  group.add(freqHousing, freqScreen);

  /* ---- letter dial readout (center-right) ---- */
  const letterTex = new CanvasTex(128, 112);
  const letterScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.032, 0.03), displayMaterial(letterTex));
  letterScreen.rotation.x = -Math.PI / 2;
  letterScreen.position.set(0.075, 0.0205, 0.01);
  const letterHousing = new THREE.Mesh(new RoundedBoxGeometry(0.045, 0.02, 0.042, 2, 0.005),
    new THREE.MeshStandardMaterial({ color: 0x20242c, roughness: 0.5, metalness: 0.3 }));
  letterHousing.position.set(0.075, 0.01, 0.01);
  letterHousing.castShadow = true;
  group.add(letterHousing, letterScreen);

  /* ---- buttons ---- */
  const btnGeo = new RoundedBoxGeometry(0.042, 0.018, 0.03, 2, 0.004);

  function makeButton(label, x, z, bg, onClick, wide = false) {
    const tex = new CanvasTex(160, 96);
    tex.draw((ctx, w, h) => drawLabel(ctx, w, h, label, { bg, font: `bold 34px 'Consolas', monospace` }));
    const side = new THREE.MeshStandardMaterial({ color: 0x2e3a4a, roughness: 0.55, metalness: 0.25 });
    const geo = wide ? new RoundedBoxGeometry(0.06, 0.02, 0.034, 2, 0.004) : btnGeo;
    const btn = new THREE.Mesh(geo, [side, side, labelMaterial(tex), side, side, side]);
    btn.position.set(x, wide ? 0.01 : 0.009, z);
    btn.castShadow = true;
    btn.userData.onClick = onClick;
    btn.userData.highlightTargets = [btn];
    group.add(btn);
    return btn;
  }

  // Tuning row: coarse down, fine down, fine up, coarse up
  makeButton('−1', -0.115, 0.052, '#cfd6e4', () => send({ type: 'tune', steps: -4 }));
  makeButton('−¼', -0.068, 0.052, '#cfd6e4', () => send({ type: 'tune', steps: -1 }));
  makeButton('+¼', -0.021, 0.052, '#cfd6e4', () => send({ type: 'tune', steps: 1 }));
  makeButton('+1', 0.026, 0.052, '#cfd6e4', () => send({ type: 'tune', steps: 4 }));

  // XMIT (red, right of tuning row)
  makeButton('XMIT', 0.095, 0.052, '#c43240', () => send({ type: 'xmit' }), true);

  // Letter row: down, up, AUTH
  makeButton('A−', -0.09, 0.105, '#cfd6e4', () => send({ type: 'letter', delta: -1 }));
  makeButton('A+', -0.043, 0.105, '#cfd6e4', () => send({ type: 'letter', delta: 1 }));
  makeButton('AUTH', 0.095, 0.105, '#2f8a4a', () => send({ type: 'auth' }), true);

  function update(v) {
    let header;
    if (v.phase === 'net') header = `NET ${v.round}/${v.total} — TUNE & KEY FOR`;
    else if (v.phase === 'auth') header = `AUTH ${v.round}/${v.total} — CHALLENGE`;
    else header = 'COMMS SECURE';

    promptTex.draw((ctx, w, h) => {
      ctx.fillStyle = '#06101a';
      ctx.fillRect(0, 0, w, h);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.font = `bold 28px 'Consolas', monospace`;
      ctx.fillStyle = '#7fb4ff';
      ctx.fillText(header, 16, 30);
      ctx.textAlign = 'center';
      ctx.font = `bold 56px 'Consolas', monospace`;
      ctx.fillStyle = '#9fe8bd';
      ctx.fillText(v.prompt || '—', w / 2, 128);
    });

    freqTex.draw((ctx, w, h) => drawReadout(ctx, w, h, `${v.freq} MHZ`, { color: '#ffd23f' }));
    letterTex.draw((ctx, w, h) => drawReadout(ctx, w, h, v.letter, { color: '#9fe8bd' }));
  }

  update(view);
  return { group, update };
}

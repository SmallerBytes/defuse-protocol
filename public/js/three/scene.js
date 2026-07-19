/**
 * 3D SCENE — room + bomb device.
 * Desktop: orbit camera, optional SSAO/DOF.
 * VR (Quest): immersive-vr stereo via Three.js XR, controller lasers,
 * head-relative move + snap turn; post-processing disabled in headset.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Device } from './device.js';
import { attachXR } from './xr.js';

export function createDeviceScene(container, initialQuality = 'medium') {
  /* ---------- renderer (XR-compatible) ---------- */
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    // Required for immersive-vr on Quest Browser.
    xrCompatible: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0c11);
  scene.fog = new THREE.Fog(0x0a0c11, 7, 18);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.25;

  /* ---------- player dolly ----------
     Camera is a child of dolly so WebXR locomotion moves the whole rig.
     On desktop, dolly stays at origin and OrbitControls orbits the bomb.
  */
  const dolly = new THREE.Group();
  scene.add(dolly);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 60);
  camera.position.set(0.95, 1.05, 1.25);
  dolly.add(camera);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.12, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.55;
  controls.maxDistance = 5;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.update();

  /* ---------- the room ---------- */
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(16, 7, 16),
    new THREE.MeshStandardMaterial({ color: 0x161a22, roughness: 0.95, metalness: 0, side: THREE.BackSide })
  );
  room.position.y = 2.6;
  room.receiveShadow = true;
  scene.add(room);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 16),
    new THREE.MeshStandardMaterial({ color: 0x23201d, roughness: 0.9, metalness: 0.02 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.851;
  floor.receiveShadow = true;
  scene.add(floor);

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.7, metalness: 0.02 });
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.07, 1.7), woodMat);
  tableTop.position.y = -0.035;
  tableTop.castShadow = tableTop.receiveShadow = true;
  scene.add(tableTop);
  const legGeo = new THREE.BoxGeometry(0.09, 0.78, 0.09);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(legGeo, woodMat);
    leg.position.set(sx * 1.18, -0.46, sz * 0.73);
    leg.castShadow = true;
    scene.add(leg);
  }

  const crateMat = new THREE.MeshStandardMaterial({ color: 0x3a3327, roughness: 0.85 });
  [[-3.2, -3.5, 0.9], [-2.4, -4.2, 0.55], [3.0, -3.8, 0.7], [3.8, -2.6, 1.1]].forEach(([x, z, s]) => {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateMat);
    crate.position.set(x, s / 2 - 0.85, z);
    crate.rotation.y = x * 0.4;
    crate.castShadow = crate.receiveShadow = true;
    scene.add(crate);
  });

  /* ---------- lights ---------- */
  scene.add(new THREE.AmbientLight(0x404a5a, 0.5));

  const keyLight = new THREE.SpotLight(0xfff1dd, 260, 14, 0.55, 0.55, 1.6);
  keyLight.position.set(1.8, 3.4, 1.2);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.bias = -0.0004;
  keyLight.target.position.set(0, 0, 0);
  scene.add(keyLight, keyLight.target);
  const fixture = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.22, 20, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x22262e, metalness: 0.7, roughness: 0.4, side: THREE.DoubleSide })
  );
  fixture.position.copy(keyLight.position).add(new THREE.Vector3(0, 0.05, 0));
  fixture.lookAt(0, 0, 0);
  fixture.rotateX(-Math.PI / 2);
  scene.add(fixture);

  const lampLight = new THREE.PointLight(0xffb35c, 14, 7, 1.8);
  lampLight.position.set(-1.05, 0.52, -0.55);
  lampLight.castShadow = true;
  lampLight.shadow.mapSize.set(1024, 1024);
  lampLight.shadow.bias = -0.0005;
  scene.add(lampLight);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x2c313c, metalness: 0.6, roughness: 0.45 });
  const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.5, 10), lampMat);
  lampArm.position.set(-1.05, 0.25, -0.55);
  lampArm.castShadow = true;
  const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.14, 18, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x394150, metalness: 0.5, roughness: 0.5, side: THREE.DoubleSide }));
  lampShade.position.set(-1.05, 0.56, -0.55);
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.03, 16), lampMat);
  lampBase.position.set(-1.05, 0.015, -0.55);
  scene.add(lampArm, lampShade, lampBase);

  const rim = new THREE.DirectionalLight(0x5a7fc0, 0.8);
  rim.position.set(-2.5, 1.6, 2.4);
  scene.add(rim);

  const fxLight = new THREE.PointLight(0xff2233, 0, 4, 1.5);
  fxLight.position.set(0, 0.9, 0);
  scene.add(fxLight);

  /* ---------- post-processing (desktop only — never in VR) ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const ssao = new SSAOPass(scene, camera, container.clientWidth, container.clientHeight);
  ssao.kernelRadius = 0.12;
  ssao.minDistance = 0.0008;
  ssao.maxDistance = 0.06;
  composer.addPass(ssao);
  const bokeh = new BokehPass(scene, camera, { focus: 1.6, aperture: 0.00045, maxblur: 0.0055 });
  composer.addPass(bokeh);
  composer.addPass(new OutputPass());

  const QUALITY = {
    low:    { pixelRatio: 0.75, keyShadow: 0,    lampShadow: 0,   ssao: false, dof: false },
    medium: { pixelRatio: 1,    keyShadow: 1024, lampShadow: 0,   ssao: false, dof: false },
    high:   { pixelRatio: Math.min(window.devicePixelRatio, 2),
              keyShadow: 2048,  lampShadow: 512, ssao: true,  dof: true }
  };

  let qualityBeforeVR = initialQuality;
  let currentQuality = initialQuality;

  function applyShadow(light, size) {
    light.castShadow = size > 0;
    if (size > 0 && light.shadow.mapSize.x !== size) {
      light.shadow.mapSize.set(size, size);
      if (light.shadow.map) {
        light.shadow.map.dispose();
        light.shadow.map = null;
      }
    }
  }

  function setQuality(level) {
    currentQuality = level;
    const q = QUALITY[level] || QUALITY.medium;
    // While presenting XR, Three.js owns the framebuffer — keep pixel ratio modest.
    const pr = renderer.xr.isPresenting ? 1 : q.pixelRatio;
    renderer.setPixelRatio(pr);
    if (!renderer.xr.isPresenting) composer.setPixelRatio(pr);
    applyShadow(keyLight, renderer.xr.isPresenting ? 0 : q.keyShadow);
    applyShadow(lampLight, 0); // point-light shadows are too expensive on Quest
    ssao.enabled = !renderer.xr.isPresenting && q.ssao;
    bokeh.enabled = !renderer.xr.isPresenting && q.dof;
    resize();
  }

  function resize() {
    if (renderer.xr.isPresenting) return;
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  /* ---------- desktop pointer interaction ---------- */
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let device = null;
  let downAt = null;
  let hovered = null;

  function castAt(e) {
    if (!device || renderer.xr.isPresenting) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(device.targets, false);
    return hits.find((h) => h.object.userData.onClick) || null;
  }

  renderer.domElement.addEventListener('pointerdown', (e) => {
    downAt = { x: e.clientX, y: e.clientY };
  });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!downAt || renderer.xr.isPresenting) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    downAt = null;
    if (moved > 7) return;
    const hit = castAt(e);
    if (hit) hit.object.userData.onClick();
  });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (renderer.xr.isPresenting) return;
    const hit = castAt(e);
    const targets = hit ? (hit.object.userData.highlightTargets || []) : [];
    if (hovered && hovered !== targets[0]) setHighlight(hovered, false);
    hovered = targets[0] || null;
    if (hovered) setHighlight(hovered, true);
    renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
  });

  function setHighlight(mesh, on) {
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (!m.userData.baseEmissive) m.userData.baseEmissive = m.emissive ? m.emissive.clone() : null;
      if (m.emissive && m.userData.baseEmissive) {
        m.emissive.copy(m.userData.baseEmissive);
        if (on) m.emissive.add(new THREE.Color(0x182618));
      }
    }
  }

  /* ---------- WebXR ---------- */
  const xr = attachXR({
    renderer,
    scene,
    camera,
    dolly,
    getTargets: () => (device ? device.targets : []),
    onSelect: (obj) => {
      if (obj.userData.onClick) obj.userData.onClick();
    },
    onSessionStart: () => {
      qualityBeforeVR = currentQuality;
      setQuality('low'); // comfort + perf defaults on Quest
      controls.enabled = false;
      // Standing pose in front of the table (local-floor: y=0 is floor).
      camera.position.set(0, 0, 0);
      dolly.position.set(0, 0, 1.35);
      dolly.rotation.set(0, 0, 0);
      document.body.classList.add('xr-presenting');
      if (api.onXRChange) api.onXRChange(true);
    },
    onSessionEnd: () => {
      controls.enabled = true;
      dolly.position.set(0, 0, 0);
      dolly.rotation.set(0, 0, 0);
      camera.position.set(0.95, 1.05, 1.25);
      controls.target.set(0, 0.12, 0);
      controls.update();
      setQuality(qualityBeforeVR);
      document.body.classList.remove('xr-presenting');
      if (api.onXRChange) api.onXRChange(false);
    }
  });

  /* ---------- FX ---------- */
  let shake = 0;
  let fxPulse = 0;
  const baseTarget = new THREE.Vector3(0, 0.12, 0);

  setQuality(initialQuality);

  /* ---------- render loop (setAnimationLoop required for XR) ---------- */
  const clock = new THREE.Clock();
  let running = true;

  function loop() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;
    const presenting = renderer.xr.isPresenting;

    if (!presenting && container.offsetParent === null) return;

    if (!presenting) controls.update();
    xr.tick(dt);
    if (device) device.tick(dt, t);

    if (!presenting && shake > 0.001) {
      controls.target.set(
        baseTarget.x + (Math.random() - 0.5) * 0.02 * shake,
        baseTarget.y + (Math.random() - 0.5) * 0.02 * shake,
        baseTarget.z + (Math.random() - 0.5) * 0.02 * shake
      );
      shake *= Math.pow(0.02, dt);
    } else if (!presenting && shake !== 0) {
      shake = 0;
      controls.target.copy(baseTarget);
    }

    if (fxPulse > 0.01) {
      fxPulse *= Math.pow(0.01, dt);
      fxLight.intensity = fxPulse;
    } else {
      fxLight.intensity = 0;
    }

    // VR: direct stereo render (no SSAO/bokeh — Quest already lens-distorts).
    if (presenting) {
      renderer.render(scene, camera);
    } else {
      if (bokeh.enabled) {
        bokeh.uniforms.focus.value = camera.position.distanceTo(baseTarget);
      }
      composer.render();
    }
  }
  renderer.setAnimationLoop(loop);

  const api = {
    onXRChange: null,
    startGame(payload, send) {
      if (device) scene.remove(device.group);
      device = new Device(payload, send);
      scene.add(device.group);
    },
    updateModule(id, view) { if (device) device.updateModule(id, view); },
    markSolved(id) {
      if (!device) return;
      device.markSolved(id);
      fxLight.color.setHex(0x39d98a);
      fxPulse = 8;
    },
    setTimer(ms) { if (device) device.setTimer(ms); },
    setStrikes(n) { if (device) device.setStrikes(n); },
    setQuality,
    enterVR: () => xr.enterVR(),
    exitVR: () => xr.exitVR(),
    isXRPresenting: () => renderer.xr.isPresenting,
    strikeFx() {
      fxLight.color.setHex(0xff2233);
      fxPulse = 22;
      if (!renderer.xr.isPresenting) shake = 1;
    },
    gameOver(won) {
      if (!device) return;
      device.gameOver(won);
      fxLight.color.setHex(won ? 0x39d98a : 0xff2233);
      fxPulse = won ? 10 : 40;
      if (!won && !renderer.xr.isPresenting) shake = 2.5;
    },
    destroy() {
      running = false;
      renderer.setAnimationLoop(null);
      if (renderer.xr.isPresenting) xr.exitVR();
      ro.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentNode) container.removeChild(renderer.domElement);
    }
  };
  return api;
}

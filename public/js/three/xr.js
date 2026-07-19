/**
 * WebXR helpers for Quest / immersive-vr.
 * Three.js owns stereo + XRWebGLLayer; this module adds controllers,
 * comfort locomotion (head-relative move + snap turn), and laser interact.
 */
import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

const SNAP_DEG = 30;
const MOVE_SPEED = 1.4; // m/s
const DEADZONE = 0.25;

/**
 * Attach XR to an existing Three.js scene/renderer.
 * @returns {{ enterVR, exitVR, isPresenting, tick, setEnabled }}
 */
export function attachXR({
  renderer,
  scene,
  camera,
  dolly,
  getTargets,
  onSelect,
  onSessionStart,
  onSessionEnd
}) {
  renderer.xr.enabled = true;
  // Prefer floor-relative tracking so standing height matches the room.
  renderer.xr.setReferenceSpaceType('local-floor');

  const modelFactory = new XRControllerModelFactory();
  const controllers = [];
  const grips = [];
  const rays = [];
  const tempMatrix = new THREE.Matrix4();
  const raycaster = new THREE.Raycaster();

  for (let i = 0; i < 2; i++) {
    const controller = renderer.xr.getController(i);
    controller.userData.index = i;
    dolly.add(controller);

    // Laser pointer line
    const lineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1.5)
    ]);
    const line = new THREE.Line(
      lineGeom,
      new THREE.LineBasicMaterial({ color: 0x39d98a, transparent: true, opacity: 0.85 })
    );
    line.scale.z = 1;
    controller.add(line);
    rays.push(line);

    controller.addEventListener('selectstart', () => {
      const hit = castFromController(controller);
      if (hit && hit.object.userData.onClick) {
        onSelect(hit.object);
      }
    });
    controller.addEventListener('connected', (e) => {
      controller.userData.inputSource = e.data;
      controller.userData.gamepad = e.data.gamepad;
    });
    controller.addEventListener('disconnected', () => {
      controller.userData.inputSource = null;
      controller.userData.gamepad = null;
    });

    controllers.push(controller);

    const grip = renderer.xr.getControllerGrip(i);
    grip.add(modelFactory.createControllerModel(grip));
    dolly.add(grip);
    grips.push(grip);
  }

  function castFromController(controller) {
    const targets = getTargets() || [];
    if (!targets.length) return null;
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    const hits = raycaster.intersectObjects(targets, false);
    return hits.find((h) => h.object.userData.onClick) || null;
  }

  // Hover highlight via right-hand / either controller ray
  let hovered = null;
  function updateHover() {
    let hit = null;
    for (const c of controllers) {
      hit = castFromController(c);
      if (hit) break;
    }
    const mesh = hit ? (hit.object.userData.highlightTargets || [hit.object])[0] : null;
    if (hovered && hovered !== mesh) setHighlight(hovered, false);
    hovered = mesh || null;
    if (hovered) setHighlight(hovered, true);
    for (const line of rays) {
      line.material.color.setHex(hit ? 0xffd23f : 0x39d98a);
    }
  }

  function setHighlight(mesh, on) {
    if (!mesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (!m.emissive) continue;
      if (!m.userData.baseEmissive) m.userData.baseEmissive = m.emissive.clone();
      m.emissive.copy(m.userData.baseEmissive);
      if (on) m.emissive.add(new THREE.Color(0x182618));
    }
  }

  // Comfort locomotion state
  let snapCooldown = 0;
  const headForward = new THREE.Vector3();
  const headRight = new THREE.Vector3();
  const wish = new THREE.Vector3();

  function readAxes(gamepad) {
    if (!gamepad || !gamepad.axes) return { x: 0, y: 0 };
    // Quest Touch: axes 2,3 are thumbstick on many profiles; fallback 0,1
    const ax = gamepad.axes;
    if (ax.length >= 4) return { x: ax[2], y: ax[3] };
    return { x: ax[0] || 0, y: ax[1] || 0 };
  }

  function tickLocomotion(dt) {
    if (!renderer.xr.isPresenting) return;
    snapCooldown = Math.max(0, snapCooldown - dt);

    const session = renderer.xr.getSession();
    if (!session) return;

    let movePad = { x: 0, y: 0 };
    let turnPad = { x: 0, y: 0 };

    for (const src of session.inputSources) {
      if (!src.gamepad) continue;
      const handed = src.handedness;
      const axes = readAxes(src.gamepad);
      if (handed === 'left') movePad = axes;
      if (handed === 'right') turnPad = axes;
    }

    // Snap turn (right stick X)
    if (snapCooldown <= 0 && Math.abs(turnPad.x) > 0.6) {
      const dir = turnPad.x > 0 ? -1 : 1;
      dolly.rotation.y += THREE.MathUtils.degToRad(SNAP_DEG) * dir;
      snapCooldown = 0.35;
    }

    // Head-relative move (left stick)
    const mx = Math.abs(movePad.x) > DEADZONE ? movePad.x : 0;
    const my = Math.abs(movePad.y) > DEADZONE ? movePad.y : 0;
    if (mx || my) {
      // XR camera world forward projected onto XZ
      const xrCam = renderer.xr.getCamera();
      xrCam.getWorldDirection(headForward);
      headForward.y = 0;
      if (headForward.lengthSq() < 1e-6) headForward.set(0, 0, -1);
      else headForward.normalize();
      headRight.crossVectors(headForward, new THREE.Vector3(0, 1, 0)).normalize();

      wish.set(0, 0, 0);
      wish.addScaledVector(headForward, -my);
      wish.addScaledVector(headRight, mx);
      if (wish.lengthSq() > 1) wish.normalize();
      dolly.position.addScaledVector(wish, MOVE_SPEED * dt);

      // Soft bounds so you don't walk into the void
      dolly.position.x = THREE.MathUtils.clamp(dolly.position.x, -3.5, 3.5);
      dolly.position.z = THREE.MathUtils.clamp(dolly.position.z, -3.5, 3.5);
    }
  }

  let sessionListenersBound = false;

  function bindSessionEvents() {
    if (sessionListenersBound) return;
    sessionListenersBound = true;
    renderer.xr.addEventListener('sessionstart', () => {
      onSessionStart && onSessionStart();
    });
    renderer.xr.addEventListener('sessionend', () => {
      onSessionEnd && onSessionEnd();
    });
  }
  bindSessionEvents();

  async function enterVR() {
    if (!navigator.xr) throw new Error('WebXR not available in this browser.');
    const ok = await navigator.xr.isSessionSupported('immersive-vr');
    if (!ok) throw new Error('immersive-vr is not supported on this device.');

    // Ensure GL context is XR-compatible before requesting the session.
    const gl = renderer.getContext();
    if (gl && gl.makeXRCompatible) await gl.makeXRCompatible();

    const sessionInit = {
      optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers']
    };
    const session = await navigator.xr.requestSession('immersive-vr', sessionInit);
    await renderer.xr.setSession(session);
  }

  function exitVR() {
    const session = renderer.xr.getSession();
    if (session) session.end();
  }

  return {
    enterVR,
    exitVR,
    isPresenting: () => renderer.xr.isPresenting,
    tick(dt) {
      if (!renderer.xr.isPresenting) return;
      tickLocomotion(dt);
      updateHover();
    },
    controllers,
    SNAP_DEG,
    MOVE_SPEED
  };
}

/** Detect immersive-vr support (Quest Browser etc.). */
export async function detectXRSupport() {
  if (!navigator.xr || !navigator.xr.isSessionSupported) {
    return { supported: false, reason: 'navigator.xr missing' };
  }
  try {
    const supported = await navigator.xr.isSessionSupported('immersive-vr');
    return { supported, reason: supported ? 'ok' : 'immersive-vr not supported' };
  } catch (e) {
    return { supported: false, reason: e.message };
  }
}

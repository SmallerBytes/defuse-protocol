/** Housefly — orbits the player's head, lands on the device, dies in the fan.
 *  Not in the manual. */
import * as THREE from 'three';

const bodyGeo = new THREE.SphereGeometry(0.007, 10, 8);
const wingGeo = new THREE.CircleGeometry(0.006, 8);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x17181d, roughness: 0.75 });
const wingMat = new THREE.MeshStandardMaterial({
  color: 0xd9e2f2,
  roughness: 0.3,
  metalness: 0.1,
  transparent: true,
  opacity: 0.45,
  side: THREE.DoubleSide
});

export function createFly() {
  const group = new THREE.Group();
  group.visible = false;

  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.scale.set(1, 0.9, 1.25);
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 8, 8), bodyMat);
  headMesh.position.set(0, 0.001, -0.007);

  const wings = [];
  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.position.set(sx * 0.0045, 0.004, 0);
    wing.rotation.set(-Math.PI / 2, 0, sx * 0.5);
    group.add(wing);
    wings.push(wing);
  }
  group.add(body, headMesh);

  /* 0 hidden, 1 circling head, 2 landed, 3 dead, 4 sucked into fan */
  let mode = 0;
  let waitT = 0;
  let landT = 0;
  let deadT = 0;
  let a = 0;
  let landSpot = null;
  const pos = new THREE.Vector3();
  const prev = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  const LAND_SPOTS = [
    [0, 0.34, 0.42], [-0.35, 0.34, 0.42], [0.35, 0.34, 0.42],
    [0, 0.06, -0.195],
    [-0.36, 0.05, -0.195], [0.36, 0.05, -0.195],
    [-0.36, 0.05, 0.195], [0, 0.05, 0.195], [0.36, 0.05, 0.195]
  ];

  function spawn() {
    mode = 1;
    waitT = 0;
    deadT = 0;
    landSpot = null;
    group.visible = true;
    group.scale.set(1, 1, 1);
    a = Math.random() * Math.PI * 2;
    pos.set(0, 1.2, 1.1);
    group.position.copy(pos);
  }

  function hide() {
    mode = 0;
    group.visible = false;
    landSpot = null;
  }

  function kill() {
    if (mode === 0 || mode === 3) return false;
    mode = 3;
    deadT = 0;
    landSpot = null;
    group.scale.set(1.15, 0.25, 1.15);
    group.rotation.set(0, Math.random() * Math.PI, Math.PI / 2);
    return true;
  }

  function land() {
    mode = 2;
    landT = 0;
    const spot = LAND_SPOTS[Math.floor(Math.random() * LAND_SPOTS.length)];
    landSpot = new THREE.Vector3(...spot);
    group.position.copy(landSpot);
    group.rotation.set(0, Math.random() * Math.PI * 2, 0);
    return true;
  }

  function flap(t, amt) {
    wings[0].rotation.z = -amt + Math.sin(t * 70) * amt * 0.8;
    wings[1].rotation.z = amt - Math.sin(t * 70) * amt * 0.8;
  }

  function tick(dt, t, { gameOver, head, fanOn, fanPos } = {}) {
    if (mode === 0) return { landed: false, alive: false };
    if (gameOver) {
      hide();
      return { landed: false, alive: false };
    }
    if (mode === 3) {
      deadT += dt;
      group.visible = deadT < 1.2;
      if (deadT >= 1.2) mode = 0;
      return { landed: false, alive: false };
    }

    if (fanOn && fanPos && (mode === 1 || mode === 2)) {
      mode = 4;
      landSpot = null;
    }

    if (mode === 4 && fanPos) {
      prev.copy(pos);
      pos.copy(group.position);
      tmp.copy(fanPos).sub(pos);
      const dist = tmp.length();
      if (dist < 0.07) {
        group.position.copy(fanPos);
        kill();
        return { landed: false, alive: false, squashed: true };
      }
      tmp.multiplyScalar(Math.min(1, (1.6 * dt) / Math.max(dist, 0.001)));
      pos.add(tmp);
      group.position.copy(pos);
      if (pos.distanceToSquared(prev) > 1e-10) group.lookAt(fanPos);
      flap(t, 0.85);
      return { landed: false, alive: true };
    }

    if (mode === 2) {
      landT += dt;
      flap(t, 0.22);
      group.position.y = landSpot.y + Math.sin(t * 28) * 0.0012;
      pos.copy(group.position);
      if (landT > 5.5) {
        mode = 1;
        landSpot = null;
        waitT = 0;
      }
      return { landed: true, alive: true };
    }

    // Circle the player's head, slow and lazy, with a little darting.
    if (!head) return { landed: false, alive: true };
    a += dt * (0.7 + Math.sin(t * 1.4) * 0.18);
    const r = 0.22 + Math.sin(t * 0.9) * 0.05;
    prev.copy(pos);
    pos.set(
      head.x + Math.cos(a) * r + Math.sin(t * 2.1) * 0.03,
      head.y + Math.sin(t * 1.7) * 0.04,
      head.z + Math.sin(a) * r + Math.cos(t * 1.5) * 0.03
    );
    group.position.copy(pos);
    if (pos.distanceToSquared(prev) > 1e-10) group.lookAt(prev.x, prev.y, prev.z);
    flap(t, 0.7);

    waitT += dt;
    if (waitT > 7 && Math.random() < dt * 0.12) {
      waitT = 0;
      return { landed: land(), alive: true };
    }
    return { landed: false, alive: true };
  }

  return { group, spawn, hide, tick, get landed() { return mode === 2; } };
}

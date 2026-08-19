/** Housefly — circles the device, occasionally lands on it, and keeps
 *  bothering the player until they swat it. Not in the manual. */
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
const hitGeo = new THREE.SphereGeometry(0.028, 10, 8);

export function createFly(onSwat) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.scale.set(1, 0.9, 1.25);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 8, 8), bodyMat);
  head.position.set(0, 0.001, -0.007);

  const wings = [];
  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.position.set(sx * 0.0045, 0.004, 0);
    wing.rotation.set(-Math.PI / 2, 0, sx * 0.5);
    group.add(wing);
    wings.push(wing);
  }

  const hit = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ visible: false }));
  hit.userData.onClick = () => onSwat?.();
  group.add(body, head, hit);

  /* state: 0 hidden, 1 flying, 2 landed, 3 dead */
  let mode = 0;
  let waitT = 0;
  let landT = 0;
  let deadT = 0;
  let a = 0;
  let landSpot = null;
  const pos = new THREE.Vector3();
  const prev = new THREE.Vector3();

  const LAND_SPOTS = [
    [0, 0.34, 0.42], [-0.35, 0.34, 0.42], [0.35, 0.34, 0.42], // front case edge
    [0, 0.06, -0.195],                                        // timer
    [-0.36, 0.05, -0.195], [0.36, 0.05, -0.195],              // back modules
    [-0.36, 0.05, 0.195], [0, 0.05, 0.195], [0.36, 0.05, 0.195] // front modules
  ];

  function spawn() {
    if (mode) return;
    mode = 1;
    waitT = 0;
    group.visible = true;
    a = Math.random() * Math.PI * 2;
    pos.set(Math.cos(a) * 1.0, 0.45 + Math.random() * 0.4, Math.sin(a) * 0.8);
    group.position.copy(pos);
  }

  function squash() {
    if (mode === 0 || mode === 3) return false;
    if (mode !== 2) return false; // only swattable when landed
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

  function tick(dt, t, gameOver) {
    if (mode === 0) return false;
    if (mode === 3) {
      deadT += dt;
      group.visible = deadT < 1.4;
      if (deadT >= 1.4) mode = 0;
      return false;
    }
    if (gameOver) {
      mode = 0;
      group.visible = false;
      return false;
    }

    if (mode === 2) {
      landT += dt;
      wings[0].rotation.z = -0.3 + Math.sin(t * 90) * 0.15;
      wings[1].rotation.z = 0.3 - Math.sin(t * 90) * 0.15;
      group.position.y = landSpot.y + Math.sin(t * 28) * 0.0012;
      if (landT > 4.5) {
        mode = 1;
        landSpot = null;
      }
      return true;
    }

    // flying: dart around the table, occasionally land
    a += dt * (1.6 + Math.sin(t * 3.1) * 0.8);
    const r = 0.85 + Math.sin(t * 2.3) * 0.25;
    prev.copy(pos);
    pos.set(
      Math.cos(a) * r + Math.sin(t * 5.7) * 0.08,
      0.32 + Math.sin(t * 7.3) * 0.12 + Math.sin(t * 2.1) * 0.08,
      Math.sin(a) * (r * 0.75) + Math.cos(t * 4.9) * 0.08
    );
    group.position.copy(pos);
    if (pos.distanceToSquared(prev) > 1e-10) group.lookAt(prev.x, prev.y, prev.z);
    wings[0].rotation.z = -0.7 + Math.sin(t * 80) * 0.55;
    wings[1].rotation.z = 0.7 - Math.sin(t * 80) * 0.55;

    waitT += dt;
    if (waitT > 4 && Math.random() < dt * 0.22) {
      waitT = 0;
      return land();
    }
    return false;
  }

  return { group, hit, spawn, squash, tick, get landed() { return mode === 2; } };
}

/** Housefly — steers around the player's head, dives onto the device, dies in the fan.
 *  Not in the manual. */
import * as THREE from 'three';

const bodyGeo = new THREE.SphereGeometry(0.008, 10, 8);
const wingGeo = new THREE.CircleGeometry(0.007, 8);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x17181d, roughness: 0.75 });
const wingMat = new THREE.MeshStandardMaterial({
  color: 0xd9e2f2,
  roughness: 0.3,
  metalness: 0.1,
  transparent: true,
  opacity: 0.5,
  side: THREE.DoubleSide
});

export function createFly() {
  const group = new THREE.Group();
  group.visible = false;

  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.scale.set(1, 0.9, 1.35);
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.0048, 8, 8), bodyMat);
  headMesh.position.set(0, 0.001, -0.008);

  const wings = [];
  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.position.set(sx * 0.005, 0.004, 0);
    wing.rotation.set(-Math.PI / 2, 0, sx * 0.5);
    group.add(wing);
    wings.push(wing);
  }
  group.add(body, headMesh);

  /* 0 hidden, 1 circling, 2 landed, 3 dead, 4 sucked, 5 wait respawn, 6 dive */
  let mode = 0;
  let enabled = false;
  let waitT = 0;
  let deadT = 0;
  let a = 0;
  let dartT = 0;
  let landSpot = null;

  const pos = new THREE.Vector3();
  const vel = new THREE.Vector3();
  const target = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const steer = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const lookMat = new THREE.Matrix4();
  const lookQuat = new THREE.Quaternion();

  const LAND_SPOTS = [
    [0, 0.34, 0.42], [-0.35, 0.34, 0.42], [0.35, 0.34, 0.42],
    [0, 0.06, -0.195],
    [-0.36, 0.05, -0.195], [0.36, 0.05, -0.195],
    [-0.36, 0.05, 0.195], [0, 0.05, 0.195], [0.36, 0.05, 0.195]
  ];

  function flap(t, amt) {
    wings[0].rotation.z = -amt + Math.sin(t * 90) * amt * 0.85;
    wings[1].rotation.z = amt - Math.sin(t * 90) * amt * 0.85;
  }

  function faceTravel(dt) {
    if (vel.lengthSq() < 1e-8) return;
    lookAt.copy(pos).add(vel);
    lookMat.lookAt(pos, lookAt, up);
    lookQuat.setFromRotationMatrix(lookMat);
    group.quaternion.slerp(lookQuat, 1 - Math.pow(0.0008, dt));
  }

  function seek(dest, maxSpeed, accel, dt) {
    desired.copy(dest).sub(pos);
    const dist = desired.length();
    if (dist > 1e-5) desired.multiplyScalar(maxSpeed / dist);
    else desired.set(0, 0, 0);
    steer.copy(desired).sub(vel);
    const maxSteer = accel * dt;
    if (steer.length() > maxSteer) steer.setLength(maxSteer);
    vel.add(steer);
    if (vel.length() > maxSpeed) vel.setLength(maxSpeed);
    pos.addScaledVector(vel, dt);
    group.position.copy(pos);
    faceTravel(dt);
    return dist;
  }

  function spawn() {
    enabled = true;
    mode = 1;
    waitT = 0;
    deadT = 0;
    dartT = 0;
    landSpot = null;
    group.visible = true;
    group.scale.set(1, 1, 1);
    a = Math.random() * Math.PI * 2;
    const side = Math.random() < 0.5 ? -1 : 1;
    pos.set(side * 1.4, 0.55 + Math.random() * 0.5, 1.8);
    vel.set(-side * 0.8, 0.2, -1.6);
    group.position.copy(pos);
    group.quaternion.identity();
  }

  function hide() {
    enabled = false;
    mode = 0;
    vel.set(0, 0, 0);
    group.visible = false;
    landSpot = null;
  }

  function kill() {
    if (mode === 0 || mode === 3 || mode === 5) return false;
    mode = 3;
    deadT = 0;
    landSpot = null;
    vel.set(0, 0, 0);
    group.scale.set(1.2, 0.22, 1.2);
    return true;
  }

  function startDive() {
    const spot = LAND_SPOTS[Math.floor(Math.random() * LAND_SPOTS.length)];
    landSpot = new THREE.Vector3(...spot);
    mode = 6;
    waitT = 0;
  }

  function tick(dt, t, { gameOver, head, fanOn, fanPos } = {}) {
    if (gameOver) {
      hide();
      return { landed: false, alive: false };
    }
    if (!enabled && mode === 0) return { landed: false, alive: false };

    if (mode === 3) {
      deadT += dt;
      group.visible = deadT < 1.1;
      if (deadT >= 1.1) {
        mode = 5;
        waitT = 8 + Math.random() * 6;
        group.visible = false;
        group.scale.set(1, 1, 1);
      }
      return { landed: false, alive: false };
    }

    if (mode === 5) {
      waitT -= dt;
      if (waitT <= 0) spawn();
      return { landed: false, alive: false };
    }

    if (fanOn && fanPos && (mode === 1 || mode === 2 || mode === 6)) {
      mode = 4;
      landSpot = null;
    }

    if (mode === 4 && fanPos) {
      const dist = seek(fanPos, 3.4, 28, dt);
      flap(t, 1);
      if (dist < 0.08) {
        group.position.copy(fanPos);
        kill();
        return { landed: false, alive: false, squashed: true };
      }
      return { landed: false, alive: true };
    }

    if (mode === 2) {
      vel.set(0, 0, 0);
      group.position.copy(landSpot);
      group.position.y = landSpot.y + Math.sin(t * 28) * 0.0012;
      pos.copy(group.position);
      flap(t, 0.28);
      return { landed: true, alive: true };
    }

    if (mode === 6 && landSpot) {
      const dist = seek(landSpot, 3.2, 22, dt);
      flap(t, 1);
      if (dist < 0.04) {
        mode = 2;
        pos.copy(landSpot);
        group.position.copy(landSpot);
        vel.set(0, 0, 0);
        return { landed: true, alive: true };
      }
      return { landed: false, alive: true };
    }

    if (!head) return { landed: false, alive: true };

    dartT -= dt;
    if (dartT <= 0) {
      a += (Math.random() - 0.5) * 1.4;
      dartT = 0.18 + Math.random() * 0.35;
    }
    a += dt * (5.2 + Math.sin(t * 2.7) * 1.4);
    const r = 0.16 + Math.sin(t * 3.3) * 0.05;
    target.set(
      head.x + Math.cos(a) * r + Math.sin(t * 11) * 0.04,
      head.y + Math.sin(t * 7.5) * 0.07 + Math.sin(a * 2) * 0.03,
      head.z + Math.sin(a) * r + Math.cos(t * 9) * 0.04
    );
    seek(target, 2.8, 26, dt);
    flap(t, 0.95);

    waitT += dt;
    if (waitT > 6 || (waitT > 3.5 && Math.random() < dt * 0.28)) startDive();
    return { landed: false, alive: true };
  }

  return { group, spawn, hide, tick, get landed() { return mode === 2; } };
}

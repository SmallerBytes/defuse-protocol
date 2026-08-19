/** Housefly — steering-based flight, harasses the player's head, settles on the
 *  countdown display, dies in the fan. Not in the manual. */
import * as THREE from 'three';

const bodyMat = new THREE.MeshStandardMaterial({ color: 0x17181d, roughness: 0.7, metalness: 0.1 });
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x51201a, roughness: 0.35, metalness: 0.2 });
const wingMat = new THREE.MeshStandardMaterial({
  color: 0xdfe7f5,
  roughness: 0.25,
  metalness: 0.05,
  transparent: true,
  opacity: 0.32,
  side: THREE.DoubleSide,
  depthWrite: false
});

const OFF = 0, INBOUND = 1, HARASS = 2, APPROACH = 3, LANDED = 4, FAN = 5, DEAD = 6, RESPAWN = 7;

export function createFly() {
  const group = new THREE.Group();
  group.visible = false;

  const rig = new THREE.Group();
  group.add(rig);

  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 10, 8), bodyMat);
  abdomen.scale.set(1, 0.85, 1.5);
  abdomen.position.z = 0.005;
  const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.0052, 10, 8), bodyMat);
  thorax.scale.set(1, 0.95, 1.15);
  thorax.position.z = -0.005;
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.0038, 8, 8), eyeMat);
  headMesh.position.set(0, 0.0008, -0.0115);
  rig.add(abdomen, thorax, headMesh);

  const wings = [];
  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.CircleGeometry(0.0085, 10), wingMat);
    wing.scale.set(0.55, 1, 1);
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.0028, 0.0035, -0.002);
    wing.position.set(sx * 0.006, 0, 0.004);
    wing.rotation.x = -Math.PI / 2;
    pivot.add(wing);
    rig.add(pivot);
    wings.push({ pivot, sx });
  }

  const legs = [];
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.0004, 0.0003, 0.006, 4), bodyMat);
      leg.position.set(sx * 0.004, -0.004, -0.006 + i * 0.006);
      leg.rotation.z = sx * 0.7;
      rig.add(leg);
      legs.push(leg);
    }
  }

  let mode = OFF;
  let enabled = false;
  let stateT = 0;
  let hopT = 0;
  let deadT = 0;
  let respawnT = 0;
  let wingPhase = 0;
  let crawlT = 0;
  let harassDur = 4;
  let dashSpeed = 1.8;

  const pos = new THREE.Vector3();
  const vel = new THREE.Vector3();
  const target = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const steer = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const anchor = new THREE.Vector3();
  const landOffset = new THREE.Vector3();
  const inboundOffset = new THREE.Vector3();
  const lookAhead = new THREE.Vector3();
  const side = new THREE.Vector3();
  const faceM = new THREE.Matrix4();
  const faceQ = new THREE.Quaternion();
  const upV = new THREE.Vector3(0, 1, 0);
  let crawlYaw = 0;

  function rand(min, max) { return min + Math.random() * (max - min); }

  /** Flies do not glide: pick a fresh waypoint constantly so the path is a
   *  chain of short straight dashes with hard corners between them. */
  function newHarassWaypoint(head) {
    anchor.copy(head);
    const yaw = rand(0, Math.PI * 2);
    const pitch = rand(-0.5, 0.35);
    const r = rand(0.12, 0.4);
    target.set(
      anchor.x + Math.cos(yaw) * Math.cos(pitch) * r,
      anchor.y + Math.sin(pitch) * r * 0.7 + rand(-0.05, 0.06),
      anchor.z + Math.sin(yaw) * Math.cos(pitch) * r
    );
    hopT = rand(0.16, 0.42);
    dashSpeed = rand(1.5, 2.3);
  }

  function spawn() {
    enabled = true;
    mode = INBOUND;
    stateT = 0;
    hopT = 0;
    deadT = 0;
    crawlT = 0;
    group.visible = true;
    group.scale.set(1, 1, 1);
    rig.rotation.set(0, 0, 0);
    const from = Math.random() < 0.5 ? -1 : 1;
    pos.set(from * rand(1.6, 2.4), rand(0.9, 1.5), rand(-1.6, 1.8));
    vel.set(-from * 1.4, -0.2, rand(-0.4, 0.4));
    inboundOffset.set(rand(-0.2, 0.2), rand(-0.1, 0.1), rand(0.15, 0.35));
    group.position.copy(pos);
  }

  function hide() {
    enabled = false;
    mode = OFF;
    group.visible = false;
    vel.set(0, 0, 0);
  }

  function kill() {
    mode = DEAD;
    deadT = 0;
    group.scale.set(1.2, 0.22, 1.2);
    group.rotation.set(0, Math.random() * Math.PI, Math.PI / 2);
    rig.rotation.set(0, 0, 0);
    vel.set(0, 0, 0);
  }

  /** Steer toward `target`, integrate, and bank into the turn. */
  function fly(dt, speed, force) {
    desired.copy(target).sub(pos);
    const dist = desired.length();
    if (dist > 1e-5) desired.multiplyScalar(speed / dist);
    steer.copy(desired).sub(vel).clampLength(0, force);
    vel.addScaledVector(steer, dt);
    vel.clampLength(0, speed * 1.35);
    pos.addScaledVector(vel, dt);
    group.position.copy(pos);

    if (vel.lengthSq() > 1e-6) {
      lookAhead.copy(pos).add(vel);
      faceM.lookAt(pos, lookAhead, upV);
      faceQ.setFromRotationMatrix(faceM);
      group.quaternion.slerp(faceQ, Math.min(1, dt * 14));
      side.crossVectors(vel, upV).normalize();
      const bank = THREE.MathUtils.clamp(-steer.dot(side) * 0.05, -0.6, 0.6);
      rig.rotation.z += (bank - rig.rotation.z) * Math.min(1, dt * 9);
    }
    return dist;
  }

  function beatWings(dt, hz, amp) {
    wingPhase += dt * hz;
    const s = Math.sin(wingPhase * Math.PI * 2);
    for (const w of wings) {
      w.pivot.rotation.z = w.sx * (0.35 + s * amp);
      w.pivot.rotation.x = s * amp * 0.35;
    }
  }

  function tick(dt, t, { gameOver, head, fanOn, fanPos, timerPos } = {}) {
    if (gameOver) {
      hide();
      return { landed: false, alive: false };
    }
    if (!enabled && mode === OFF) return { landed: false, alive: false };
    stateT += dt;

    if (mode === DEAD) {
      deadT += dt;
      group.visible = deadT < 1.1;
      if (deadT >= 1.1) {
        mode = RESPAWN;
        respawnT = rand(7, 12);
        group.visible = false;
        group.scale.set(1, 1, 1);
      }
      return { landed: false, alive: false };
    }

    if (mode === RESPAWN) {
      respawnT -= dt;
      if (respawnT <= 0) spawn();
      return { landed: false, alive: false };
    }

    // The fan wins from anywhere: it drags the fly off the bomb or out of the air.
    if (fanOn && fanPos && mode !== FAN) {
      mode = FAN;
      stateT = 0;
    } else if (!fanOn && mode === FAN) {
      mode = HARASS;
      stateT = 0;
      hopT = 0;
      harassDur = rand(2.5, 4);
    }

    if (mode === FAN && fanPos) {
      target.copy(fanPos);
      const dist = fly(dt, 2.6, 14);
      // extra suction so it visibly loses the fight near the intake
      tmp.copy(fanPos).sub(pos);
      vel.addScaledVector(tmp.normalize(), dt * (2.5 + 6 / Math.max(dist, 0.12)));
      beatWings(dt, 90, 1.1);
      if (dist < 0.06) {
        pos.copy(fanPos);
        group.position.copy(pos);
        kill();
        return { landed: false, alive: false, squashed: true };
      }
      return { landed: false, alive: true };
    }

    if (mode === LANDED && timerPos) {
      crawlT -= dt;
      if (crawlT <= 0) {
        crawlT = rand(0.7, 2.2);
        landOffset.set(rand(-0.085, 0.085), 0.005, rand(-0.03, 0.03));
        crawlYaw = rand(-Math.PI, Math.PI);
      }
      tmp.copy(timerPos).add(landOffset);
      pos.lerp(tmp, Math.min(1, dt * 1.2));
      group.position.copy(pos);
      group.position.y += Math.sin(t * 22) * 0.0006;
      faceQ.setFromAxisAngle(upV, crawlYaw);
      group.quaternion.slerp(faceQ, Math.min(1, dt * 2.5));
      rig.rotation.z = 0;
      beatWings(dt, 6, 0.12);
      return { landed: true, alive: true };
    }

    if (mode === APPROACH && timerPos) {
      target.copy(timerPos).add(landOffset);
      const dist = fly(dt, THREE.MathUtils.clamp(1.9 * dist01(pos, target), 0.35, 1.9), 11);
      beatWings(dt, 78, 1.0);
      if (dist < 0.02) {
        mode = LANDED;
        stateT = 0;
        crawlT = rand(0.6, 1.6);
        vel.set(0, 0, 0);
        return { landed: true, alive: true };
      }
      return { landed: false, alive: true };
    }

    if (mode === INBOUND && head) {
      target.copy(head).add(inboundOffset);
      const dist = fly(dt, 2.2, 9);
      beatWings(dt, 82, 1.0);
      if (dist < 0.45 || stateT > 3.5) {
        mode = HARASS;
        stateT = 0;
        hopT = 0;
        harassDur = rand(3.5, 5);
      }
      return { landed: false, alive: true };
    }

    if (!head) return { landed: false, alive: true };

    // Harass: dash-and-corner around the head until it commits to the timer.
    hopT -= dt;
    if (hopT <= 0) newHarassWaypoint(head);
    fly(dt, dashSpeed, 16);
    beatWings(dt, 86, 1.05);

    if (stateT > harassDur && timerPos) {
      landOffset.set(rand(-0.07, 0.07), 0.005, rand(-0.025, 0.025));
      mode = APPROACH;
      stateT = 0;
    }
    return { landed: false, alive: true };
  }

  function dist01(a, b) {
    return Math.min(1, a.distanceTo(b) / 0.35);
  }

  return {
    group,
    spawn,
    hide,
    tick,
    get landed() { return mode === LANDED; },
    get flying() { return mode === HARASS || mode === INBOUND || mode === APPROACH || mode === FAN; }
  };
}

/** Desk fan on the table — the only reliable way to get rid of the fly. */
import * as THREE from 'three';

const plastic = new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.55, metalness: 0.08 });
const plasticDk = new THREE.MeshStandardMaterial({ color: 0x3a3e48, roughness: 0.5, metalness: 0.15 });
const metal = new THREE.MeshStandardMaterial({ color: 0x9aa3b0, roughness: 0.35, metalness: 0.75 });
const bladeMat = new THREE.MeshStandardMaterial({ color: 0xc5cdd8, roughness: 0.4, metalness: 0.25, side: THREE.DoubleSide });

export function createDeskFan(onToggle) {
  const group = new THREE.Group();
  group.position.set(-0.95, 0, 0.62);
  group.rotation.y = 0.55;

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.028, 20), plasticDk);
  base.position.y = 0.014;
  base.castShadow = true;
  group.add(base);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.15, 8), plasticDk);
  stem.position.y = 0.1;
  group.add(stem);

  const head = new THREE.Group();
  head.position.set(0.02, 0.19, 0);
  head.rotation.y = -0.15;
  group.add(head);

  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.055, 16), plastic);
  motor.rotation.x = Math.PI / 2;
  motor.castShadow = true;
  head.add(motor);

  const cage = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.006, 8, 24), metal);
  cage.position.z = 0.028;
  head.add(cage);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.012, 10), metal);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 0.03;
  head.add(hub);

  const spokes = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.003, 6, 16), metal);
  spokes.position.z = 0.028;
  head.add(spokes);

  const blades = new THREE.Group();
  blades.position.z = 0.026;
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.022, 0.002), bladeMat);
    blade.position.x = 0.04;
    blade.rotation.x = 0.25;
    const pivot = new THREE.Group();
    pivot.rotation.z = (i / 3) * Math.PI * 2;
    pivot.add(blade);
    blades.add(pivot);
  }
  head.add(blades);

  const ledMat = new THREE.MeshStandardMaterial({
    color: 0x1c0d0f, emissive: 0x39d98a, emissiveIntensity: 0, roughness: 0.3
  });
  const led = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.006, 8), ledMat);
  led.position.set(0.04, 0.03, 0.04);
  group.add(led);

  const btn = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.016, 0.032), plastic);
  btn.position.set(0, 0.03, 0.055);
  group.add(btn);

  let on = false;
  let until = 0;
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.28, 0.16),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.position.set(0, 0.12, 0.03);
  hit.userData.onClick = () => {
    if (on) return;
    until = 3;
    on = true;
    ledMat.emissiveIntensity = 1.4;
    onToggle?.(true);
  };
  hit.userData.highlightTargets = [btn, motor];
  group.add(hit);

  function tick(dt) {
    if (until > 0) {
      until -= dt;
      blades.rotation.z += dt * 22;
      if (until <= 0) {
        on = false;
        ledMat.emissiveIntensity = 0;
        onToggle?.(false);
      }
    }
  }

  function setVisible(v) {
    group.visible = v;
    if (!v && on) {
      on = false;
      until = 0;
      ledMat.emissiveIntensity = 0;
      onToggle?.(false);
    }
  }

  function intakeWorld(out) {
    head.getWorldPosition(out);
    return out;
  }

  return {
    group,
    hit,
    tick,
    setVisible,
    intakeWorld,
    get on() { return on; }
  };
}

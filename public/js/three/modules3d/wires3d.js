/** Wire Cutting — real tube geometry strung between terminal posts. */
import * as THREE from 'three';

const WIRE_HEX = {
  red: 0xd92b3a, blue: 0x2563d9, yellow: 0xe0bd2a,
  white: 0xe6e4da, black: 0x17181c, green: 0x27a352
};

const postGeo = new THREE.CylinderGeometry(0.009, 0.011, 0.03, 12);
const postMat = new THREE.MeshStandardMaterial({ color: 0xb9b9bd, metalness: 0.9, roughness: 0.35 });

function wireCurve(z, sag, jitter) {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.115, 0.024, z),
    new THREE.Vector3(-0.04, 0.024 - sag, z + jitter),
    new THREE.Vector3(0.04, 0.024 - sag * 0.8, z - jitter),
    new THREE.Vector3(0.115, 0.024, z)
  ]);
}

function cutCurves(z, sag, jitter) {
  // Two halves drooping toward the plate after the cut.
  return [
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.115, 0.024, z),
      new THREE.Vector3(-0.055, 0.02 - sag, z + jitter),
      new THREE.Vector3(-0.022, 0.006, z + jitter * 1.6)
    ]),
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.115, 0.024, z),
      new THREE.Vector3(0.055, 0.02 - sag * 0.8, z - jitter),
      new THREE.Vector3(0.022, 0.006, z - jitter * 1.6)
    ])
  ];
}

export function build({ view, send }) {
  const group = new THREE.Group();
  const n = view.wires.length;
  const spacing = Math.min(0.052, 0.24 / n);
  const z0 = -((n - 1) / 2) * spacing;
  const entries = [];

  view.wires.forEach((w, i) => {
    const z = z0 + i * spacing;
    const sag = 0.004 + (i % 3) * 0.003;
    const jitter = ((i % 2) ? 1 : -1) * 0.004;
    const mat = new THREE.MeshStandardMaterial({
      color: WIRE_HEX[w.color] ?? 0x888888,
      roughness: w.color === 'black' ? 0.5 : 0.38,
      metalness: 0.05
    });

    const intact = new THREE.Mesh(new THREE.TubeGeometry(wireCurve(z, sag, jitter), 24, 0.0058, 10), mat);
    intact.castShadow = true;

    const cutGroup = new THREE.Group();
    for (const c of cutCurves(z, sag, jitter)) {
      const half = new THREE.Mesh(new THREE.TubeGeometry(c, 14, 0.0058, 10), mat);
      half.castShadow = true;
      cutGroup.add(half);
      // exposed copper tip
      const tipPos = c.getPoint(1);
      const tip = new THREE.Mesh(
        new THREE.SphereGeometry(0.0062, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xc47a3a, metalness: 0.8, roughness: 0.4 })
      );
      tip.position.copy(tipPos);
      cutGroup.add(tip);
    }
    cutGroup.visible = false;

    // terminal posts
    for (const x of [-0.115, 0.115]) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(x, 0.012, z);
      post.castShadow = true;
      group.add(post);
    }

    // generous invisible hitbox so wires are clickable
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(0.23, 0.028, Math.min(spacing * 0.9, 0.034)),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.set(0, 0.02, z);
    hit.userData.onClick = () => send({ type: 'cut', index: i + 1 });
    hit.userData.highlightTargets = [intact];

    group.add(intact, cutGroup, hit);
    entries.push({ intact, cutGroup, hit });
  });

  function update(v) {
    v.wires.forEach((w, i) => {
      const e = entries[i];
      e.intact.visible = !w.cut;
      e.cutGroup.visible = !!w.cut;
      if (w.cut) e.hit.userData.onClick = null;
    });
  }
  update(view);

  return { group, update };
}

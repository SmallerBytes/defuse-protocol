# Adding a New Puzzle Module

A module is three small pieces: server logic, optional JSON content, and a
client renderer pair. Nothing else needs to change — rooms, timers, strikes,
manuals, payload scoping, and logging all work generically.

Worked example: a "Keypad Cipher" module.

## 1. Content (optional): `data/modules/keypad.json`

Put tunable content in JSON so designers can iterate without touching code:

```json
{
  "alphabets": ["runes", "circuits", "constellations"],
  "keysByDifficulty": { "easy": 4, "normal": 6, "hard": 8 }
}
```

## 2. Server logic: `server/modules/keypad.js`

```js
const data = require('../../data/modules/keypad.json');

const TYPE = 'keypad';
const NAME = 'Keypad Cipher';

function generate(ctx) {
  const { rng, difficulty, serial } = ctx;   // seeded child RNG — use ONLY this
  // ... build the puzzle ...
  return {
    state:  { solution: /* server-only truth */ },
    manual: { intro: '...', /* what Experts read */ },
    view:   { /* what the Defuser sees */ }
  };
}

function view(state) { /* derive Defuser view from state */ }

function action(state, act, ctx) {
  // Mutate state, then return one of:
  // { status: 'ok',     view: view(state) }
  // { status: 'solved', view: view(state), detail: 'for the session log' }
  // { status: 'strike', view: view(state), detail: 'what went wrong' }
}

module.exports = { type: TYPE, name: NAME, generate, action };
```

Rules of the contract:

- **Determinism**: all randomness must come from `ctx.rng` (it's a per-module
  child of the game seed). Never use `Math.random()`.
- **Secrecy**: anything in `state` stays server-side. `view` and `manual` are
  sent to clients — never put the solution in either.
- **Statelessness**: `action` receives the same `state` object every call;
  multi-stage modules just track progress inside it.

## 3. Register it: `server/modules/index.js`

```js
const keypad = require('./keypad');
const MODULES = [wires, symbols, memory, morse, logicgrid, keypad];
```

## 4a. Expert manual renderer: `public/js/modules/keypad.js`

```js
export const keypad = {
  renderManual(el, manual) {
    // Build the Experts' manual page (DOM) from `manual`.
  }
};
```

Register it in `public/js/modules/index.js`:

```js
import { keypad } from './keypad.js';
export const moduleRenderers = { wires, symbols, memory, morse, logicgrid, keypad };
```

## 4b. Defuser 3D builder: `public/js/three/modules3d/keypad3d.js`

The Defuser side is a 3D scene; your module is real geometry mounted on a
faceplate the device provides (local origin = faceplate top, `+y` up, the
usable area is roughly 0.3 × 0.3 scene units).

```js
import * as THREE from 'three';

export function build({ view, send }) {
  const group = new THREE.Group();

  const button = new THREE.Mesh(/* real geometry, PBR material */);
  button.castShadow = true;
  button.userData.onClick = () => send({ type: 'press', key: 'A' });
  button.userData.highlightTargets = [button];   // hover highlight
  group.add(button);

  return {
    group,
    update(view) { /* reflect new server state in the geometry */ },
    tick(dt, t, solved) { /* optional per-frame animation */ }
  };
}
```

Conventions:

- Set `userData.onClick` on any mesh the Defuser can press (use an invisible
  oversized hitbox for thin geometry — see `wires3d.js`). Set it to `null`
  to disable.
- Use `textUtil.js` (`CanvasTex`, `drawLabel`, `drawReadout`) for keycap
  legends and emissive readouts — labels on real meshes, never flat panels.
- `tick` receives `solved` so loops (flashing lamps, etc.) can stop.

Register it in `public/js/three/modules3d/index.js`:

```js
import { build as keypad } from './keypad3d.js';
export const moduleBuilders = { wires, symbols, memory, morse, logicgrid, keypad };
```

## 5. Test it

Add a solver case for your type in `tests/smoke.js` (drive `action` to
`solved` using `state`), then:

```bash
npm test
```

The smoke suite automatically picks up every registered module and verifies
generation across difficulties/seeds plus seeded determinism.

## Design guidelines for good modules

- The Defuser's screen alone must be insufficient, and the manual alone must
  be insufficient. The solution should require *both* sides talking.
- Generate rule tables/content from the RNG so manuals can't be memorized.
- Make wrong actions unambiguous (one strike), and prefer puzzles where
  describing what you see is the hard, fun part.

# DEFUSE PROTOCOL

A cooperative multiplayer puzzle game about talking fast under pressure.

One player — the **Defuser** — sits in front of a **fully 3D bomb device** on a
table in a dimly lit room: a metal case with protruding module faceplates, real
wires, keycaps, lamps, and an engraved serial plate, viewed through an orbiting
perspective camera. Everyone else — the **Experts** — sees only a classified
defusal manual whose rules are **regenerated for every game**. Nobody has the
full picture. Solve every module before the timer hits zero, and don't collect
too many strikes.

The Defuser scene is rendered with Three.js (WebGL): PBR materials with
environment reflections, two physical shadow-casting light sources, SSAO,
depth of field, ACES tone mapping, raycast interaction with every component,
and camera shake + light pulses on strikes. Drag to orbit, scroll to zoom.

**Quest 2 / 3:** immersive WebXR is supported in Meta Quest Browser over HTTPS.
See **[docs/QUEST.md](docs/QUEST.md)** for the full “How to test on Quest 2” guide.
Short version: open the GitHub Pages URL → **VR SOLO DEMO** → **ENTER VR**.

## Quick Start

```bash
npm install
npm start          # http://localhost:3210  (auto-picks next free port if busy)
```

### Desktop multiplayer

1. Open the URL in a browser, enter a codename, and **CREATE ROOM**.
2. Friends open the same URL (other tabs work for testing) and **JOIN** with the 4-letter room code.
3. Pick roles in the lobby — exactly one Defuser, any number of Experts.
4. The host chooses a difficulty (and optionally a seed for replays) and arms the device.
5. Talk. Fast. Defusers can tap **ENTER VR (QUEST)** when WebXR is available.

### Quest solo (static HTTPS)

1. Deploy `public/` to GitHub Pages (this repo does that automatically).
2. On the headset: `https://SmallerBytes.github.io/defuse-protocol/`
3. **VR SOLO DEMO (QUEST)** → **ENTER VR (QUEST)**

> `file://` and plain HTTP will not start WebXR.

> The Defuser may not look at the manual screen, and the Experts may not look at
> the device. That's the whole game — enforce it on the honor system (or separate rooms).

## Scripts

| Command         | What it does                                            |
| --------------- | ------------------------------------------------------- |
| `npm start`     | Run the server (serves the client + WebSocket backend)  |
| `npm run dev`   | Same, with auto-restart on file changes                 |
| `npm test`      | Smoke tests: generation, solvability, seeded determinism |
| `npm run build:solo` | Rebuild the client-side solo game bundle            |
| `node tests/e2e.js <port>` | Full game over real WebSockets (server must be running) |

## The Modules

| Module          | Defuser sees (3D hardware)                                  | Experts have                                        |
| --------------- | ----------------------------------------------------------- | --------------------------------------------------- |
| Wire Cutting    | 3–6 sagging wire tubes strung between terminal posts        | A freshly generated rule table per wire count       |
| Symbol Matching | 4 physical keycaps with printed glyphs                      | 6 overlapping symbol columns; press in column order |
| Memory Sequence | A glowing display housing + 4 labeled keycaps               | Per-stage rules referencing earlier presses         |
| Morse Code      | A glass dome lamp (real light source), tuning knob, TX key  | Morse alphabet + word→frequency table               |
| Logic Grid      | A tilted CRT question screen + 3 answer bars                | Clue list that pins down a unique assignment        |

Every table, rule, clue, and symbol column is derived from the game seed, so no
two games (or manuals) are the same — and any seed can be replayed.

## Difficulty

| Difficulty | Modules | Time | Strikes | Timer accel per strike |
| ---------- | ------- | ---- | ------- | ---------------------- |
| Easy       | 3       | 6:00 | 3       | +15%                   |
| Normal     | 5       | 5:00 | 3       | +25%                   |
| Hard       | 5       | 3:30 | 2       | +35%                   |

## Project Structure

```
KTNE/
├── server/
│   ├── index.js          # Express + Socket.io entry point, REST API
│   ├── gameManager.js    # Room registry and join codes
│   ├── room.js           # Lobby, roles, socket emission
│   ├── game.js           # Authoritative round state: timer, strikes, modules
│   ├── rng.js            # Seeded RNG (mulberry32) for replayable games
│   ├── logger.js         # Per-session JSONL logs in ./logs
│   ├── stats.js          # JSON-file stats persistence
│   └── modules/          # One file per puzzle module + registry
├── data/
│   └── modules/*.json    # Data-driven module definitions (colors, glyphs, words…)
├── public/
│   ├── index.html        # Single-page client (all screens, Three.js import map)
│   ├── css/style.css     # Dark industrial theme, responsive
│   └── js/
│       ├── main.js       # Screens, socket wiring, HUD
│       ├── sound.js      # WebAudio-synthesized SFX (no asset files)
│       ├── modules/      # Expert manual page renderers
│       └── three/        # 3D scene: room, lights, post FX, device, module geometry
│           ├── scene.js      # Renderer, orbit camera, room, lights, SSAO + DOF
│           ├── device.js     # The bomb: case, timer, strike LEDs, serial plate
│           ├── textUtil.js   # Canvas-texture legends/readouts for meshes
│           └── modules3d/    # Real-geometry builders, one per module type
├── tests/
│   ├── smoke.js          # Generation/solvability/determinism checks
│   └── e2e.js            # Real-WebSocket full game test
└── docs/                 # Architecture, API, WS events, module guide, roadmap
```

## Documentation

- [How to test on Quest 2](docs/QUEST.md) — WebXR, controller map, Pages URL, limitations
- [Architecture & data model](docs/ARCHITECTURE.md) — includes the SQL schema to use if you outgrow JSON-file storage
- [REST API](docs/API.md)
- [WebSocket event reference](docs/WEBSOCKET_EVENTS.md)
- [Adding a new module](docs/ADDING_MODULES.md)
- [Roadmap](docs/ROADMAP.md)

## Design Notes

- **The server is the only authority.** Clients never receive solutions: the
  Defuser gets sanitized module *views*, Experts get *manuals*, and all actions
  are validated server-side. Experts physically cannot trigger device actions.
- **Manuals are generated, not static.** Rule tables are built from the seed at
  game start, so memorizing the manual between games is impossible.
- **Session logs** (`logs/*.jsonl`) record every action, strike, and outcome
  with timestamps for post-game review and debugging.
- **3D rendering** uses Three.js loaded from the jsDelivr CDN via an import
  map (pinned to 0.165.0) — playing requires internet access, or vendor the
  files locally and point the import map at them.
- **Video quality**: the Defuser HUD has a LOW / MEDIUM / HIGH selector
  (persisted per browser, default MEDIUM). It controls render resolution,
  shadow casters/resolution, SSAO, and depth of field live — HIGH enables
  everything, LOW disables all shadows and post-processing for weak GPUs.

Inspired by the communication loop of bomb-defusal party games; all puzzle
designs, rules, and content here are original.

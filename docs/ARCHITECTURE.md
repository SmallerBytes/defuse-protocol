# Architecture

## Overview

```
┌─────────────┐   socket.io    ┌──────────────────────────────┐
│ Defuser tab │ ◄────────────► │  Node.js server               │
└─────────────┘                │  ┌─────────────┐              │
┌─────────────┐                │  │ GameManager │ rooms map    │
│ Expert tab  │ ◄────────────► │  └──────┬──────┘              │
└─────────────┘                │         │                     │
┌─────────────┐                │     ┌───▼───┐  one per room   │
│ Expert tab  │ ◄────────────► │     │ Room  │ players, roles  │
└─────────────┘                │     └───┬───┘                 │
                               │     ┌───▼───┐  one per round  │
        REST (stats, health)   │     │ Game  │ timer, strikes, │
       ◄───────────────────────│     └───┬───┘ module states   │
                               │     ┌───▼────────────┐        │
                               │     │ Module registry │        │
                               │     │ wires/symbols/… │        │
                               └─────┴────────────────┴────────┘
```

### Layers

| Layer            | File(s)                  | Responsibility                                          |
| ---------------- | ------------------------ | ------------------------------------------------------- |
| Transport        | `server/index.js`        | HTTP static serving, REST API, socket event routing     |
| Lobby            | `server/gameManager.js`, `server/room.js` | Room codes, membership, role assignment, broadcast fan-out |
| Game engine      | `server/game.js`         | Timer (authoritative, strike-accelerated), strikes, win/loss, role-scoped payloads |
| Puzzle modules   | `server/modules/*`       | Pure generate/action logic; no socket knowledge         |
| Content          | `data/modules/*.json`    | Data-driven definitions (colors, glyphs, word lists, names) |
| Persistence      | `server/stats.js`, `server/logger.js` | Stats JSON file, per-session JSONL logs    |
| Client           | `public/js/*`            | Rendering only; all rules live server-side              |

## Information Isolation (the core design constraint)

The entire game depends on the Defuser and Experts holding *different* information:

- `Game.defuserPayload()` returns module **views** (what's physically on the
  device) plus the serial number. It never contains rules or solutions.
- `Game.expertPayload()` returns module **manuals** (rule tables, charts,
  clues). It never contains device views or the serial number.
- `Room.handleAction()` rejects module actions from anyone whose role is not
  `defuser`.
- Solutions (`state.solution`, rule tables, answers) never leave the server.

One acceptable leak: the Morse module's flash pattern is sent to the Defuser
client to animate the lamp. The Defuser still has to dictate dots and dashes
to the Experts because the word→frequency table is in the manual only.

## Seeded Determinism

`server/rng.js` implements mulberry32 seeded by a string hash. The `Game`
constructor derives one child RNG per module instance
(`seed::<type>#<index>`), so:

- the same seed + difficulty always produces an identical device and manual;
- module generation order can change without breaking other modules' streams;
- post-strike regeneration (Memory stages) stays reproducible via its own
  dedicated child stream.

## Module Contract (server)

Every module file exports:

```js
{
  type: 'wires',            // unique id, matches client renderer key
  name: 'Wire Cutting',     // display name
  generate(ctx) => { state, manual, view },
  action(state, action, ctx) => { status, view, detail? }
}
```

- `ctx` = `{ rng, difficulty, serial }`.
- `state` is private server-side truth (may contain the solution).
- `manual` is a serializable structure rendered by the Expert client.
- `view` is a serializable structure rendered by the Defuser client.
- `status` is `'ok' | 'solved' | 'strike'`; `detail` is logged for debugging.

The registry (`server/modules/index.js`) is the single place modules are wired in.

## Data Model / Database Schema

The shipped persistence is a JSON file (`data/stats.json`) plus JSONL session
logs — appropriate for a self-hosted party game. If you need real storage
(accounts, leaderboards), the equivalent relational schema:

```sql
CREATE TABLE players (
  id          SERIAL PRIMARY KEY,
  codename    VARCHAR(20) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE games (
  id            SERIAL PRIMARY KEY,
  room_code     CHAR(4)     NOT NULL,
  seed          VARCHAR(40) NOT NULL,
  difficulty    VARCHAR(10) NOT NULL CHECK (difficulty IN ('easy','normal','hard')),
  result        VARCHAR(10) NOT NULL CHECK (result IN ('won','lost','abandoned')),
  loss_reason   VARCHAR(20),          -- 'timer' | 'strikes' | NULL
  strikes       SMALLINT    NOT NULL DEFAULT 0,
  modules_total SMALLINT    NOT NULL,
  modules_solved SMALLINT   NOT NULL,
  duration_ms   INTEGER     NOT NULL,
  started_at    TIMESTAMPTZ NOT NULL,
  ended_at      TIMESTAMPTZ NOT NULL
);

CREATE TABLE game_players (
  game_id    INTEGER REFERENCES games(id),
  player_id  INTEGER REFERENCES players(id),
  role       VARCHAR(10) NOT NULL CHECK (role IN ('defuser','expert')),
  PRIMARY KEY (game_id, player_id)
);

CREATE TABLE game_events (        -- mirrors the JSONL session log
  id         BIGSERIAL PRIMARY KEY,
  game_id    INTEGER REFERENCES games(id),
  at         TIMESTAMPTZ NOT NULL,
  event      VARCHAR(30) NOT NULL,  -- 'module:action', 'game:strike', ...
  module_id  VARCHAR(8),
  payload    JSONB
);

CREATE INDEX idx_games_seed ON games(seed);
CREATE INDEX idx_events_game ON game_events(game_id, at);
```

## Client Architecture

- `public/js/main.js` owns the screen state machine
  (home → lobby → game → end) and all socket handlers.
- **Experts** get a document: `public/js/modules/index.js` maps module
  `type` → `{ renderManual(el, manual) }`.
- **The Defuser gets a real-time 3D scene** (`public/js/three/`):
  - `scene.js` — WebGL renderer (PCF soft shadows, ACES tone mapping),
    perspective `OrbitControls` camera, a full room (floor, walls, table,
    background crates, fog), two physical shadow-casting lights with visible
    fixtures (overhead spot + desk lamp), image-based PBR reflections via
    `RoomEnvironment`, and an `EffectComposer` chain with SSAO and bokeh
    depth of field. Pointer raycasting handles click/hover (drags are
    disambiguated from clicks by pointer travel distance).
  - `device.js` — the bomb as solid geometry: rounded metal case, rivets,
    carry handle, engraved serial plate, protruding module faceplates with
    status LEDs, an emissive timer display, and strike LEDs.
  - `modules3d/*` — one builder per module type returning
    `{ group, update(view), tick?(dt, t, solved) }`. All puzzle hardware is
    real meshes: tube-geometry wires with droopy cut halves, rounded-box
    keycaps, a glass-dome Morse lamp containing an actual `PointLight`,
    cylinder tuning knobs. Text appears only as canvas-texture legends and
    emissive readouts on mesh surfaces — there are no flat panels or sprites.
  - `textUtil.js` — redrawable canvas textures for those legends/readouts.
- Game feedback is physical: strikes pulse a red point light and shake the
  camera; solves pulse green and light the module's status LED; the timer
  display lives on the device itself.
- Sound is synthesized with WebAudio (`public/js/sound.js`) — zero asset files.
- Three.js (0.165.0) is loaded via an import map from jsDelivr; no build step.

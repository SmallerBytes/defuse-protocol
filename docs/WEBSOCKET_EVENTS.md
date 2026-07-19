# WebSocket Event Reference

Transport: Socket.io. Events marked **(ack)** use Socket.io acknowledgement
callbacks for their response.

## Client → Server

### `room:create` (ack)

```js
emit('room:create', { name: 'WRENCH' }, (res) => {})
// res: { ok: true, code: '8MTU' }
```

Creates a room; the creator becomes host and is assigned the `defuser` role.

### `room:join` (ack)

```js
emit('room:join', { code: '8MTU', name: 'BOOKWORM' }, (res) => {})
// res: { ok: true, code: '8MTU' } | { ok: false, error: 'Room not found.' }
```

Joins an existing room as `expert`. If a game is already running, the joiner
immediately receives `game:started` with the Expert payload (late-join spectating).

### `room:setRole`

```js
emit('room:setRole', { role: 'defuser' | 'expert' })
```

Only one defuser may exist; claiming `defuser` demotes the current one to
`expert`. Ignored while a game is running.

### `room:leave`

Leaves the room. Empty rooms are destroyed.

### `game:start` (ack) — host only

```js
emit('game:start', { difficulty: 'normal', seed: 'CRIMSON-FOX-42' }, (res) => {})
// res: { ok: true } | { error: 'A Defuser must be assigned before starting.' }
```

`seed` is optional; omit for a random one.

### `module:action` — defuser only

```js
emit('module:action', { moduleId: 'm2', action: { ... } })
```

Module-specific action payloads:

| Module      | Actions                                                        |
| ----------- | -------------------------------------------------------------- |
| `wires`     | `{ type: 'cut', index: 1..6 }` (1-based, top to bottom)        |
| `symbols`   | `{ type: 'press', glyph: 'Ω' }`                                |
| `memory`    | `{ type: 'press', position: 1..4 }`                            |
| `morse`     | `{ type: 'tune', index }` · `{ type: 'transmit' }`             |
| `logicgrid` | `{ type: 'answer', option: 'CRIMSON' }`                        |

Actions from non-defusers or after game end are silently ignored.

### `game:end` — host only

Abandons the current round and returns the room to the lobby (`game:reset`).

## Server → Client

### `room:state` — broadcast on any lobby change

```js
{
  code: '8MTU',
  hostId: '<socketId>',
  inGame: false,
  players: [ { id, name, role: 'defuser'|'expert', isHost } ]
}
```

### `game:started` — sent individually, **role-scoped**

Defuser receives:

```js
{
  role: 'defuser', seed, difficulty, serial: 'KQ73J4',
  timeMs, maxStrikes, strikes,
  modules: [ { id: 'm1', type: 'wires', name: 'Wire Cutting', view: {...}, solved: false } ]
}
```

Experts receive (note: **no serial, no views**):

```js
{
  role: 'expert', seed, difficulty,
  timeMs, maxStrikes, strikes,
  manuals: [ { id: 'm1', type: 'wires', name: 'Wire Cutting', manual: {...}, solved: false } ]
}
```

### `game:tick` — broadcast ~2×/s

```js
{ remainingMs: 287500, timeScale: 1.25 }
```

`timeScale` grows with each strike (the clock literally runs faster).

### `module:update` — defusers only

```js
{ moduleId: 'm2', view: { ... } }   // re-render this module
```

### `module:solved` — broadcast

```js
{ moduleId: 'm2', solvedCount: 3 }
```

### `game:strike` — broadcast

```js
{ strikes: 1, maxStrikes: 3, moduleId: 'm2' }
```

### `game:over` — broadcast

```js
{
  result: 'won' | 'lost',
  reason: 'all modules defused' | 'timer' | 'strikes',
  seed, difficulty, strikes,
  modulesSolved, modulesTotal,
  timeRemainingMs, durationMs,
  stats: { /* updated aggregate stats, same shape as GET /api/stats */ }
}
```

### `game:reset` — broadcast

The host abandoned the round; return to the lobby screen.

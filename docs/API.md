# REST API

All real-time gameplay flows over WebSockets (see
[WEBSOCKET_EVENTS.md](WEBSOCKET_EVENTS.md)). The REST surface is small and
read-only.

Base URL: `http://<host>:<port>`

## `GET /api/health`

Liveness probe.

```json
{ "ok": true, "uptime": 123.45 }
```

## `GET /api/stats`

Aggregate statistics across all completed games on this server.

```json
{
  "gamesPlayed": 12,
  "wins": 7,
  "losses": 5,
  "totalStrikes": 19,
  "modulesSolved": 51,
  "fastestWinMs": 184211,
  "byDifficulty": {
    "easy":   { "played": 3, "wins": 3 },
    "normal": { "played": 6, "wins": 3 },
    "hard":   { "played": 3, "wins": 1 }
  },
  "recentGames": [
    {
      "at": "2026-06-10T17:06:30.581Z",
      "won": true,
      "difficulty": "normal",
      "seed": "CRIMSON-FOX-42",
      "strikes": 1,
      "durationMs": 254772
    }
  ]
}
```

## `GET /api/modules`

The installed puzzle module catalog.

```json
[
  { "type": "wires",     "name": "Wire Cutting" },
  { "type": "symbols",   "name": "Symbol Matching" },
  { "type": "memory",    "name": "Memory Sequence" },
  { "type": "morse",     "name": "Morse Code" },
  { "type": "logicgrid", "name": "Logic Grid" }
]
```

## `GET /api/difficulties`

Difficulty presets, straight from the game engine config.

```json
[
  { "key": "easy",   "moduleCount": 3, "timeMs": 360000, "maxStrikes": 3, "strikeAccel": 0.15 },
  { "key": "normal", "moduleCount": 5, "timeMs": 300000, "maxStrikes": 3, "strikeAccel": 0.25 },
  { "key": "hard",   "moduleCount": 5, "timeMs": 210000, "maxStrikes": 2, "strikeAccel": 0.35 }
]
```

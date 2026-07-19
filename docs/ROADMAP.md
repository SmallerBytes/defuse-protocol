# Roadmap

## Near term (polish)

- [ ] Voice-chat hint: surface a "talk!" indicator when the defuser idles on a module
- [ ] Spectator role (sees both sides, can't act) for streaming/teaching
- [ ] Per-room settings: custom time, custom strike count, module pool selection
- [ ] Colorblind-safe wire palette + patterns on wires
- [ ] Pause/resume for casual play
- [ ] Reconnection grace period (rejoin with the same role mid-game)

## New modules (the registry makes these drop-in)

- [ ] **Keypad Cipher** — glyph keypad; manual maps glyph families to press orders
- [ ] **Pressure Valve** — analog gauge the Defuser must keep in a band while
      solving a side puzzle (continuous attention mechanic)
- [ ] **Switch Matrix** — 4×4 switches; manual gives target parity per row/column
- [ ] **Audio Frequencies** — Defuser hears a chord; Experts have a tone chart
- [ ] **Needy modules** — periodically re-arming modules that demand attention
      and never count as "solved" (timer pressure multiplier)

## Systems

- [ ] **Campaign mode** — series of devices with escalating module counts and a
      shared strike pool
- [ ] **Manual printing** — `GET /manual/:roomCode` printable HTML so Experts
      can play from paper
- [ ] **Persistent accounts + leaderboards** — swap `stats.js` for the SQL
      schema in ARCHITECTURE.md; track per-player solve times by module type
- [ ] **Replay viewer** — the JSONL session logs already contain everything
      needed to reconstruct a game; build a scrubber UI on top
- [ ] **Localization** — manual text generation already flows through single
      functions per module; extract to string templates
- [ ] **Daily seed** — everyone plays the same generated device, compare times

## Scale & ops

- [ ] Redis-backed room state for multi-instance hosting (socket.io adapter)
- [ ] Rate limiting on socket events
- [ ] Docker image + compose file
- [ ] Telemetry: module-level fail rates to tune difficulty

# How to test on Quest 2 / 3

DEFUSE PROTOCOL’s Defuser view is a **WebXR** immersive-vr scene. You play it in **Meta Quest Browser** over **HTTPS**. There is no APK / Unity / Godot build in this pass.

## Quick path (recommended): GitHub Pages + Solo VR

1. Open the Pages URL (after deploy):
   ```
   https://SmallerBytes.github.io/defuse-protocol/
   ```
2. On the Quest, open **Meta Quest Browser** and paste that URL.
3. Tap **VR SOLO DEMO (QUEST)**.
4. Tap **ENTER VR (QUEST)** and allow immersive VR.
5. You’re standing at a table with the bomb. Use the controllers (map below).

`file://` and plain `http://` **will not** start WebXR. Always use `https://`.

## Controller map (Quest Touch)

| Input | Action |
| ----- | ------ |
| **Trigger** (either hand) | Interact / use — cut wire, press keycap, TX, answer, etc. |
| **Left stick** | Head-relative walk (move around the table) |
| **Right stick** left/right | Snap turn **30°** (comfort default) |
| Laser pointer | Aim at module parts (highlight = can select) |

Gameplay cues in VR (HTML HUD is hidden in-headset):

- Timer + strike LEDs live **on the bomb**
- Serial number is engraved on the **front** of the case — walk/snap around to read it
- **Experts outside the headset** should use the fixed Field Manual:
  `https://smallerbytes.github.io/defuse-protocol/manual.html`
  (Print → Save as PDF). Solo demo still shows the manual on-screen for practice.

## Multiplayer on Quest

Multiplayer still needs the **Node server** (Socket.io). Pages alone cannot run it.

Options:

1. Run the server on a free host (Railway, Render, Fly.io) with HTTPS.
2. Open Pages with a server query param:
   ```
   https://SmallerBytes.github.io/defuse-protocol/?server=https://YOUR-BACKEND
   ```
3. Or tunnel a local server: `cloudflared tunnel --url http://localhost:3210` and open the `https://…` URL in Quest Browser, then CREATE ROOM as Defuser → ENTER VR.

Experts stay on phones/laptops with the manual (no headset required).

## Desktop fallback

Unchanged: orbit-drag the bomb, click modules, VIDEO quality LOW/MED/HIGH. VR button is a no-op without WebXR.

## Local HTTPS for Quest (dev)

```bash
npm start
# in another terminal:
cloudflared tunnel --url http://localhost:3210
```

Open the printed `https://…` URL on the Quest. Prefer **VR SOLO DEMO** if you only want to validate WebXR.

## Remaining VR limitations

- **HTML HUD** is hidden while presenting; rely on the device timer / LEDs / audio
- **Experts** should use the printed/PDF Field Manual on a phone or laptop — not the headset
- **Perf:** VR forces LOW quality (no SSAO/DOF, no point-light shadows). Quest 2 may still dip in dense modules
- **Comfort:** snap turn only (no smooth turn). No teleport yet
- **Multiplayer + Pages** requires a separate HTTPS Node backend
- Three.js owns stereo / `XRWebGLLayer`; we do **not** stack CRT/barrel post-FX in VR (Quest already lens-distorts)

## Rebuild solo bundle after server module changes

```bash
npm run build:solo
```

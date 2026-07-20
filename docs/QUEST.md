# How to test on Quest 2 / 3

DEFUSE PROTOCOL’s Defuser view is a **WebXR** immersive-vr scene. You play it in **Meta Quest Browser** over **HTTPS**. There is no APK / Unity / Godot build in this pass.

## Quick path (recommended): GitHub Pages

1. Open the Pages URL (after deploy):
   ```
   https://SmallerBytes.github.io/defuse-protocol/
   ```
2. On the Quest, open **Meta Quest Browser** and paste that URL.
3. Choose **DIFFICULTY** (and optional **SEED** / **VIDEO QUALITY**) on the home screen **before** starting.
4. Tap **START IN VR (QUEST)** and allow immersive VR.
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
- **Experts outside the headset** use the fixed Field Manual:
  `https://smallerbytes.github.io/defuse-protocol/manual.html`
  (Print → Save as PDF). The in-app manual panel is removed — teammates stay on a phone or laptop.

## Desktop / flat screen

On the same home screen, pick difficulty then **START ON SCREEN**. You can tap **ENTER VR** later if WebXR is available.

## Local HTTPS for Quest (dev)

```bash
npm start
# in another terminal:
cloudflared tunnel --url http://localhost:3210
```

Open the printed `https://…` URL on the Quest.

## Remaining VR limitations

- **HTML HUD** is hidden while presenting; rely on the device timer / LEDs / audio
- **Experts** should use the printed/PDF Field Manual on a phone or laptop — not the headset
- **Perf:** VR forces LOW quality (no SSAO/DOF, no point-light shadows). Quest 2 may still dip in dense modules
- **Comfort:** snap turn only (no smooth turn). No teleport yet
- Three.js owns stereo / `XRWebGLLayer`; we do **not** stack CRT/barrel post-FX in VR (Quest already lens-distorts)

## Rebuild solo bundle after server module changes

```bash
npm run build:solo
```

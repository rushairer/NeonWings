# NeonWings

A controller-first, five-stage, side-scrolling neon arcade shooter built with browser Canvas 2D. Originally tuned for AYANEO AIR MINI. Play as **FALCON-01** (fast, small hitbox) or **VANGUARD-02** (more armor).

## Currently playable

- Five themed stages and five multi-phase bosses; higher-difficulty loops after stage five
- 11 enemy types, formations, three weapon families, collectible power-ups and BOMB
- Gamepad rumble where browser/device supports it, Web Audio synthesis, volume and vibration options
- Pause, fullscreen, local high score, end-of-run statistics
- v23 foundation: 4:3 letterbox sizing; auto-pause on background/focus loss or controller disconnection; browser-storage fallback
- Pause menu → **CONTROLLER OPTIONS**: change both fire buttons and BOMB independently, calibrate stick deadzone (8–44%), reset controller defaults without resetting audio

## Run

Open `index.html` in a modern browser. For a static server:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000. No runtime dependencies or network services are required.

```sh
npm run check
npm test
npm run build
```

The build copies the offline-capable game files to `dist/`. No bundling or remote assets are necessary yet.

## Controls

| Context | Gamepad | Keyboard |
| --- | --- | --- |
| Move | Left stick / D-pad | Arrow keys / WASD |
| Fire (hold) | B / RT (remappable) | Space / J / K |
| BOMB | A (remappable) | Shift / L / X |
| Start / pause / resume | Start | Enter to start; P / Escape to pause/resume |
| Select fighter / adjust pause settings | D-pad | Arrow keys |
| Fullscreen | Select | F |
| Controller options | Pause → Controller Options (B to confirm) | Pause → Controller Options (Enter to confirm) |

When the page becomes hidden, loses focus, or the active controller disconnects, gameplay pauses without auto-resuming. After reconnect, release held buttons before pressing Start again. Menu confirmation always stays on physical B and system Start/Select are never remapped.

## GitHub Pages

The workflow tests, builds, and publishes `dist/` when changes reach `main`. Configure the repository once at **Settings → Pages → Build and deployment → Source: GitHub Actions**. The workflow cannot turn this repository setting on itself. Deployment may be blocked until this one-time setting is enabled.

## Development

See [AGENTS.md](AGENTS.md) for invariants and test gates; [ROADMAP.md](ROADMAP.md) for upcoming versions.

This project is still evolving. Hardware rumble and browser fullscreen are browser/device-dependent; not all browsers support them. No software license has yet been specified in this repository.

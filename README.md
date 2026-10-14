# NeonWings

A controller-first, five-stage, side-scrolling neon arcade shooter built with browser Canvas 2D. Originally tuned for AYANEO AIR MINI. Play as **FALCON-01** (fast, small hitbox) or **VANGUARD-02** (more armor).

## Currently playable

- Five themed stages and five multi-phase bosses; higher-difficulty loops after stage five
- 11 enemy types, formations, three weapon families, collectible power-ups and BOMB
- Gamepad rumble where browser/device supports it, Web Audio synthesis, volume and vibration options
- Pause, fullscreen, local high score, end-of-run statistics
- v23 foundation: 4:3 letterbox sizing; auto-pause on background/focus loss or controller disconnection; browser-storage fallback
- Pause menu → **CONTROLLER OPTIONS**: change both fire buttons, BOMB and OVERDRIVE independently; calibrate stick deadzone (8–44%); restore controller defaults without resetting audio
- v24 in development: graze enemy shots to build charge, chain enemy kills for up to 5× score, then manually trigger NEON OVERDRIVE to temporarily amplify the current weapon
- v24.1 hardening: continuous projectile collision against fast bullets, contact priority over grazing, bounded effects/projectile arrays, and F3 performance diagnostics
- v25 first pass: shield enemies protect their front until shield energy is broken; splitters release two small drones on destruction; carriers visibly telegraph and launch a limited number of escorts
- v25 arenas: five different procedural backdrops and timed, telegraphed hazards; warnings indicate the future danger zone before it can hurt the player
- v25.1 Boss dismantling: shoot either visible cannon mount to disable it; destroyed turrets reduce the Boss attack density/rate; clearing the fifth stage for the first time awards a pauseable victory epilogue before optional Loop 2

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
| NEON OVERDRIVE | Y (remappable) | C / I |
| Start / pause / resume | Start | Enter to start; P / Escape to pause/resume |
| Select fighter / adjust pause settings | D-pad | Arrow keys |
| Fullscreen | Select | F |
| Controller options | Pause → Controller Options (B to confirm) | Pause → Controller Options (Enter to confirm) |

When the page becomes hidden, loses focus, or the active controller disconnects, gameplay pauses without auto-resuming. After reconnect, release held buttons before pressing Start again. Menu confirmation always stays on physical B and system Start/Select are never remapped.

## NEON OVERDRIVE (v24 preview)

Graze incoming bullets **without actually colliding** with them (one charge per bullet), or defeat enemies, to fill a 100-point energy meter. Activate manually using **Y** or **C / I**. The timer only advances during active waves/Boss fights; pause and between-stage transitions do not consume charge.

- **FALCON-01:** gains more energy from grazing; 6-second Overdrive, +18% movement, piercing cyan lances (up to three different enemies).
- **VANGUARD-02:** gains more charge from regular kills; 7-second Overdrive, 30% shot/missile damage boost and one protective hit absorption.
- **Weapons:** blue line shoots a piercing lance; purple spread widens and deals +50% close-range damage; yellow missiles fan out to several nearby targets with a capped extra volley.
- **Scoring:** 3.8-second combo chain, multiplier increases every five kills up to 5×; getting hit breaks the combo. Bomb kills still award normal score but never farm charge or combos.

Overdrive requires a full meter and cannot recharge while active. A damaging hit ends it; Vanguard may use its one shield charge first. HUD shows energy, active duration, graze count and combo. These features require controller/browser playtesting before a stable release claim.

### Profiling / performance budgets

Press **F3** on a keyboard during play to toggle a small performance diagnostics overlay showing observed FPS, frames longer than 25 ms, particle/enemy-bullet counts, shots and missiles. Rendering uses a fixed logical 1280×960 playfield. v24.1 limits active particles to 800, enemy bullets to 340, player bullets to 240, and missiles to 48. These are defensive memory ceilings, **not** evidence of stable 60 FPS on AYANEO hardware. Bullets use swept collision against enemies and the player, including across frames with longer elapsed time. Real-device playtests should check controller feel, visual readability and frame pacing.

## v25 enemy behavior preview

- **Shield (Stage 3 and Stage 5):** a visible left-facing energy arc absorbs frontal damage, has finite shield health, and can be bypassed by flanking from behind. After its barrier breaks, the normal hull takes full damage.
- **Splitter (Stage 4):** destroyed splitters release up to two small drone enemies, only during active waves. A screen-clearing BOMB suppresses this secondary spawn.
- **Carrier (Stage 5):** a glowing hangar warns of a drone launch; each carrier deploys at most three escorts over its lifetime with a maximum of two escorts alive per carrier.

Spawned drones give only small points and count toward total defeated enemies. They do **not** increase stage wave goals, extend combos, charge Overdrive, or drop pickups. The live enemy list has a maximum size of 84. Stage 1's reward formation no longer spawns Stage 3-only shield units.

These features currently have unit/integration coverage, not final hardware or browser balance approval.

## Five living arenas

The original 1280×960 Canvas playfield now renders stage-specific, procedurally drawn environment silhouettes, with no remote images or new dependencies. Hazards are **fair, timed, and telegraphed**:

| Stage | Environment mechanic | Player counterplay |
| --- | --- | --- |
| 1 — Skyline | Narrow electrical rail column | Move outside the glowing vertical stripe |
| 2 — Canyon | Targeted rockfall impact | Leave the marked circular impact zone |
| 3 — Orbit | Full-width cryo lane | Move above or below the marked row |
| 4 — Hive | Blooming spore cloud | Exit the spore ring |
| 5 — Citadel | Diagonal core scan | Dodge away from the slanted energy path |

Danger zones are purely visual during their warning phase. Damage can only occur during their brief active phase and uses normal HP, invulnerability, and fighter shielding. The world clock freezes during pause, transitions, and boss rewards, then resets for the next stage. These mechanics still require real browser/handheld balance testing.

## Boss weapon mounts and first-clear ending (v25.1)

Each of the five bosses now has **two visible, player-facing turrets** with individual health rings. Target a glowing turret with bullets or missiles; breaking it deals a small amount of damage to the main Boss HP, awards a fixed one-time bonus, and reduces aimed-fan projectile count plus overall attack frequency. Core hits still deal direct Boss damage, and BOMB remains a defensive alternative. Breaking a mount cannot grant repeated points.

After **Stage 5 is cleared for the first time in Loop 1**, the game shows a victory epilogue with the run score and combat stats. This is an explicit, non-timed intermission: the high score is saved and no enemies or danger timers advance. **Start or Enter** begins Loop 2. Later loops do not repeat the epilogue.

These improvements are validated by deterministic rules and mocked-canvas integration tests. In-game appearance and device performance still need visual and handheld verification.

## GitHub Pages

The workflow tests, builds, and publishes `dist/` when changes reach `main`. Configure the repository once at **Settings → Pages → Build and deployment → Source: GitHub Actions**. The workflow cannot turn this repository setting on itself. Deployment may be blocked until this one-time setting is enabled.

## Development

See [AGENTS.md](AGENTS.md) for invariants and test gates; [ROADMAP.md](ROADMAP.md) for upcoming versions.

This project is still evolving. Hardware rumble and browser fullscreen are browser/device-dependent; not all browsers support them. No software license has yet been specified in this repository.

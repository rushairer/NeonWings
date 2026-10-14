# NeonWings development roadmap

Status is based on code shipped to `main`. Aspirational features are **not** described as completed.

## v23 — Foundation & handheld polish (in progress)

- [x] Split static entry point from the existing game runtime without changing rendering technology
- [x] Preserve 4:3 logical aspect ratio on widescreen and portrait displays
- [x] Pause when tab/app is hidden or focused window is lost; clear held keys
- [x] Gracefully handle browser environments without localStorage
- [x] Add dependency-free Node smoke tests and GitHub Actions build/deploy workflow
- [ ] Remappable gamepad controls and tunable stick deadzone
- [ ] Gamepad disconnect/reconnect recovery; device testing on AYANEO AIR MINI
- [ ] Verify first-load, pause, sound and controller behaviors in Chromium and Android
- [ ] Consider TypeScript/Vite only after confirming no regression in Pages/offline behavior

## v24 — Combat evolution (planned)

- [ ] NEON OVERDRIVE: graze charging, score chains and temporary weapon-specific burst
- [ ] Distinct active/passive capabilities for both fighters
- [ ] Prototype one complete first-stage vertical slice before spreading changes

## v25 — Living worlds (planned)

- [ ] Real mechanics for shield, splitter and carrier enemies
- [ ] Five differentiated environments; environmental hazards and readable telegraphs
- [ ] Boss weak points, detachable parts and first-clear ending

## v26 — Arcade universe (planned)

- [ ] Boss Rush, Training and Mission modes
- [ ] Local achievements, grades and per-mode leaderboards
- [ ] Deterministic seeds and a replay-compatible simulation core

## v27 — Signature experience (planned)

- [ ] Music and visual-polish pass
- [ ] Optional PWA/offline installation path
- [ ] Performance budgets, device acceptance and release packaging

## Quality gates

`npm run check`, `npm test`, `npm run build`; manual gamepad and audio checks are still required before saying a version is released.

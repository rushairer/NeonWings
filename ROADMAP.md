# NeonWings development roadmap

Status is based on code shipped to `main`. Aspirational features are **not** described as completed.

## v23 — Foundation & handheld polish (in progress)

- [x] Split static entry point from the existing game runtime without changing rendering technology
- [x] Preserve 4:3 logical aspect ratio on widescreen and portrait displays
- [x] Pause when tab/app is hidden or focused window is lost; clear held keys
- [x] Gracefully handle browser environments without localStorage
- [x] Add dependency-free Node smoke tests and GitHub Actions build/deploy workflow
- [x] Remappable dual fire buttons / bomb button, saved settings and tunable stick deadzone (8–44%)
- [x] Gamepad disconnection pauses; reconnect requires releasing held buttons before explicit resume
- [ ] AYANEO AIR MINI physical controller, rumble and audio regression testing
- [ ] Verify first-load, pause, sound and controller behaviors in Chromium and Android
- [ ] Consider TypeScript/Vite only after confirming no regression in Pages/offline behavior

## v24 — Combat evolution (in progress)

- [x] Pure tested NEON OVERDRIVE rules: one-time grazing, kill-charge, combo multiplier, timed activation
- [x] Full game wiring: keyboard/gamepad activation, remappable Y button, energy/combo HUD and combat statistics
- [x] Blue piercing lance, purple wide spread with close-range damage, yellow multi-target missile volley
- [x] Distinct fighter traits: Falcon graze/speed bonus; Vanguard kill-charge/damage/one-hit guard
- [x] Fix Bomb wave completion and count Bomb kills accurately without combo/charge farming
- [x] v24.1: swept projectile collision, hit-before-graze resolution, bounded FX/bullets, F3 frame diagnostics
- [ ] First-stage balance review and 60 FPS profiling on AYANEO AIR MINI
- [ ] Visual QA for crowded HUD/bullets and sustained Overdrive effects in Chromium/Android
- [ ] Optional telegraph/accessibility tuning after playtesting

## v25 — Living worlds (in progress)

- [x] Shield enemies have finite frontal barriers, break visual effects and flanking counterplay
- [x] Splitters release two child drones and carriers launch capped escort waves with hatch telegraphs
- [x] Child drones have restricted score economy (no wave goals, combo, energy or drops); Stage 1 roster corrected
- [x] Five procedural environments, unique warned hazards, normal damage / invulnerability, and pause-safe timers
- [ ] Stage environment hardware/balance verification in Chromium and AYANEO AIR MINI
- [x] Five Bosses have individually destructible front weapon mounts; destroying mounts reduces projectile density/frequency
- [x] First complete clear saves high score and shows a victory epilogue; explicit Start/Enter returns to stronger Loop 2
- [ ] Boss weapon readability and difficulty pacing acceptance tests on real devices
- [ ] Device/browser gameplay balance checks for Stages 3–5

## v26 — Arcade universe (in progress)

- [x] Separate, tested Classic / Boss Rush / Training progression and menu rules
- [x] Boss Rush: five real Bosses in sequence, differentiated clear / Game Over, and separate local best score
- [x] Training: selectable stage, ten-kill Boss drills, full-health equipment reset, unranked free play
- [ ] Mission mode and tailored completion objectives
- [ ] Local achievements, run grades and per-mode leaderboard history
- [ ] Daily seeded challenge; deterministic combat RNG separate from rendering; replay-compatible fixed-tick simulation still pending
- [ ] Device/browser acceptance for mode menus and full five-Boss run

## v27 — Signature experience (planned)

- [ ] Music and visual-polish pass
- [ ] Optional PWA/offline installation path
- [ ] Performance budgets, device acceptance and release packaging

## Quality gates

`npm run check`, `npm test`, `npm run build`; manual gamepad and audio checks are still required before saying a version is released.

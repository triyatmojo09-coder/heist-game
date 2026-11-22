# Midnight Heist

[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/triyatmojo09-coder/heist-game/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/triyatmojo09-coder/heist-game/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

An original top-down heist game, built for the [make.fun best heist game bounty](https://make.fun/bounty/best-heist-game-20261122-0559). Slip in, clean it out, and vanish before the police cordon closes.

## How it plays

Three escalating venues — **Gilded Palm Jewellers**, **Meridian Trust Bank**, **Aster Museum** — each patrolled by guards with vision cones and swept by wall cameras. Pick locked doors, crack the vault with a timing minigame, and grab loot where every bag has a value **and** a weight: the more you carry, the slower you run, so greed is a real choice. Every sighting and alarm feeds a **police response clock** that drains faster while the alarm is hot; reach the getaway van before it hits zero. Between jobs, the hideout shows your total take, per-job grades, and sells three tools: faster lockpicks, camera jammer charges, and a bigger duffel bag.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| Shift | Run |
| E (hold) | Pick a locked door |
| E (tap, by the vault) | Crack the vault — press E again when the needle is in the green, three tumblers |
| Q | Fire the camera jammer (blacks out cameras for 6 seconds) |
| P / Esc | Pause |
| R | Restart the job |
| M | Mute |
| Mouse | Click buttons on the title, hideout, pause and results screens |

Loot is grabbed by walking over it; escaping needs you to stand on the van until the ring closes. Progress (stash, grades, gear) is kept in `localStorage`.

## Play it

Serve `game/` with any static server — `node serve.ts` then open http://localhost:8080 — and it plays fully offline, with no network requests. All sound is synthesized with WebAudio; all art is drawn on canvas.

## Files

- `game/src/config.js` — tuning, palette, gear and grades
- `game/src/levels.js` — the three venue maps, patrols and cameras
- `game/src/world.js` — the simulation: patrols, vision, loot, vault crack, police clock
- `game/src/render.js` — all canvas drawing: map, cones, thief, HUD, minigame
- `game/src/input.js` — keyboard and mouse state
- `game/src/audio.js` — synthesized sound effects
- `game/src/save.js` — progress in localStorage
- `game/src/shots.js` — staged scenes for the screenshots
- `game/src/main.js` — screens and the frame loop
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the output directory and writes `dossier.json`

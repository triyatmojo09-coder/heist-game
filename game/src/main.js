// Midnight Heist: boot, screens and the frame loop.
// One job: title -> hideout (jobs and gear) -> a job -> results, with the
// simulation in world.js and all in-job drawing in render.js.

import { INK, UPGRADES, VIEW, gradeFor, money } from './config.js';
import { LEVELS } from './levels.js';
import { HeistWorld } from './world.js';
import { drawWorld, label, roundRect } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { loadSave, storeSave } from './save.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const input = createInput(canvas);
const audio = createAudio();
let save = loadSave();

let screen = 'title'; // title | hideout | play | results
let paused = false;
let world = null;
let levelIndex = 0;
let endTimer = null;
let results = null;
let hitboxes = [];
const backdrop = stageShot('cover').world; // the title idles over a staged job

const params = new URLSearchParams(window.location.search);
const staged = params.get('shot') ? stageShot(params.get('shot')) : null;

/** Register a clickable rectangle for this frame. */
function button(x, y, w, h, text, action, options = {}) {
  const mouse = input.mouse();
  const hover = mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;
  ctx.fillStyle = options.fill ?? (hover ? '#2c3a5c' : '#1d2740');
  roundRect(ctx, x, y, w, h, 7);
  ctx.fill();
  ctx.strokeStyle = options.edge ?? INK.panelEdge;
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 7);
  ctx.stroke();
  label(ctx, text, x + w / 2, y + h / 2 + 1, options.size ?? 14, options.colour ?? INK.text);
  hitboxes.push({ x, y, w, h, action });
}

/** Run the action of whatever was clicked, using last frame's hitboxes. */
function handleClicks() {
  for (const click of input.takeClicks()) {
    audio.unlock();
    const hit = hitboxes.find((box) => click.x >= box.x && click.x <= box.x + box.w && click.y >= box.y && click.y <= box.y + box.h);
    if (hit) {
      audio.click();
      hit.action();
    }
  }
}

/** Start a job: a fresh world for the venue, with the crew's current gear. */
function startJob(index) {
  levelIndex = index;
  world = new HeistWorld(LEVELS[index], save.upgrades, (Math.random() * 1e9) | 0);
  paused = false;
  endTimer = null;
  results = null;
  screen = 'play';
}

/** Settle a finished job into the ledger and show its results. */
function finishJob() {
  const escaped = world.status === 'escaped';
  const share = world.lootShare();
  const grade = escaped ? gradeFor(share) : '—';
  let isBest = false;
  if (escaped) {
    save.cash += world.carriedValue;
    save.totalStolen += world.carriedValue;
    const id = LEVELS[levelIndex].id;
    const previous = save.best[id];
    if (!previous || world.carriedValue > previous.value) {
      save.best[id] = {
        value: world.carriedValue,
        lootShare: share,
        grade,
        seconds: Math.round(world.time),
        spotted: world.spotted,
      };
      isBest = true;
    }
    save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, levelIndex + 2));
    storeSave(save);
  }
  results = {
    escaped,
    reason: world.bustReason,
    value: world.carriedValue,
    share,
    grade,
    seconds: world.time,
    spotted: world.spotted,
    isBest,
  };
  screen = 'results';
}

/** Play the sounds the simulation asked for this frame. */
function playEvents() {
  for (const event of world.events) {
    if (event === 'pickup') audio.pickup();
    else if (event === 'click') audio.click();
    else if (event === 'tumbler' || event === 'vault') audio.tumbler();
    else if (event === 'noise') audio.noise();
    else if (event === 'alarm') audio.alarm();
    else if (event === 'jam') audio.jam();
  }
  world.events.length = 0;
}

const QUIET = { moveX: 0, moveY: 0, sprint: false, interactDown: false, interactPressed: false, jammerPressed: false, cancelPressed: false };

/** One frame of the game proper. */
function stepPlay(dt) {
  if (input.wasTapped('m')) audio.toggleMute();
  if (paused) {
    if (input.wasTapped('p') || input.wasTapped('escape')) paused = false;
    if (input.wasTapped('r')) startJob(levelIndex);
    return;
  }
  if (input.wasTapped('p') || (input.wasTapped('escape') && !world.minigame)) {
    paused = true;
    return;
  }
  if (input.wasTapped('r')) {
    startJob(levelIndex);
    return;
  }
  const axes = input.axes();
  world.step(dt, {
    moveX: axes.x,
    moveY: axes.y,
    sprint: input.sprint(),
    interactDown: input.interactHeld(),
    interactPressed: input.interactTapped(),
    jammerPressed: input.jammerTapped(),
    cancelPressed: input.cancelTapped(),
  });
  playEvents();
  if (world.status !== 'playing' && endTimer === null) {
    endTimer = 1.0;
    if (world.status === 'escaped') audio.escaped();
    else audio.busted();
  }
  if (endTimer !== null) {
    endTimer -= dt;
    if (endTimer <= 0) finishJob();
  }
}

/** The title screen: the staged jewellers idling behind the name of the game. */
function drawTitle(now) {
  drawWorld(ctx, backdrop, now);
  ctx.fillStyle = 'rgba(5, 7, 13, 0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  label(ctx, 'MIDNIGHT HEIST', VIEW.width / 2, 210, 62, INK.gold, 'center', 800);
  label(ctx, 'Slip in. Clean it out. Vanish before the cordon closes.', VIEW.width / 2, 256, 18, INK.text);
  label(ctx, 'Three venues, patrolled and camera-watched. Crack the vault, mind the alarm,', VIEW.width / 2, 300, 14, INK.textDim);
  label(ctx, 'and spend the take on better gear between jobs.', VIEW.width / 2, 322, 14, INK.textDim);
  button(VIEW.width / 2 - 130, 362, 260, 52, 'PLAN THE NIGHT', () => {
    screen = 'hideout';
  }, { fill: '#3d2f10', edge: INK.gold, size: 17, colour: INK.goldSoft });
  const done = Object.keys(save.best).length;
  label(ctx, save.totalStolen > 0 ? `Lifetime take ${money(save.totalStolen)} · ${done} of ${LEVELS.length} venues cleaned` : 'WASD move · Shift run · E use · Q jammer · P pause', VIEW.width / 2, 458, 13, INK.textDim);
  if (input.wasTapped('enter') || input.wasTapped(' ')) screen = 'hideout';
}

/** The hideout: pick a job on the left, buy gear on the right. */
function drawHideout(data) {
  ctx.fillStyle = INK.night;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#11182a';
  ctx.fillRect(0, 0, VIEW.width, 64);
  ctx.fillStyle = INK.gold;
  ctx.fillRect(0, 64, VIEW.width, 2);
  label(ctx, 'THE HIDEOUT', 24, 32, 24, INK.text, 'left', 800);
  label(ctx, `STASH ${money(data.cash)}`, VIEW.width - 24, 26, 17, INK.gold, 'right', 800);
  label(ctx, `lifetime take ${money(data.totalStolen)}`, VIEW.width - 24, 48, 12, INK.textDim, 'right', 600);

  label(ctx, "TONIGHT'S JOBS", 24, 88, 13, INK.textDim, 'left', 800);
  LEVELS.forEach((level, index) => {
    const y = 104 + index * 108;
    const locked = index >= data.unlocked;
    const best = data.best[level.id];
    ctx.fillStyle = locked ? 'rgba(16, 20, 32, 0.9)' : 'rgba(23, 30, 48, 0.95)';
    roundRect(ctx, 24, y, 520, 94, 9);
    ctx.fill();
    ctx.fillStyle = level.accent;
    ctx.fillRect(24, y, 6, 94);
    label(ctx, level.name, 48, y + 24, 18, locked ? INK.textDim : INK.text, 'left', 800);
    label(ctx, level.tagline, 48, y + 48, 12.5, INK.textDim, 'left', 600);
    if (locked) {
      label(ctx, 'LOCKED — finish the job above first', 48, y + 74, 12.5, INK.alarm, 'left', 700);
    } else if (best) {
      label(ctx, `Best: grade ${best.grade} · ${money(best.value)} (${Math.round(best.lootShare * 100)}% of the loot) · spotted ×${best.spotted}`, 48, y + 74, 12.5, INK.calm, 'left', 700);
    } else {
      label(ctx, 'Not attempted yet', 48, y + 74, 12.5, INK.textDim, 'left', 700);
    }
    if (!locked) {
      button(436, y + 26, 88, 42, 'START', () => startJob(index), { size: 14 });
    }
  });

  label(ctx, 'GEAR — bought with the take', 584, 88, 13, INK.textDim, 'left', 800);
  Object.entries(UPGRADES).forEach(([key, upgrade], row) => {
    const y = 104 + row * 108;
    const owned = data.upgrades[key];
    const maxed = owned >= upgrade.prices.length;
    const price = maxed ? null : upgrade.prices[owned];
    ctx.fillStyle = 'rgba(23, 30, 48, 0.95)';
    roundRect(ctx, 584, y, 352, 94, 9);
    ctx.fill();
    label(ctx, upgrade.name, 602, y + 22, 15.5, INK.text, 'left', 800);
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i < owned ? INK.gold : 'rgba(255, 255, 255, 0.16)';
      ctx.beginPath();
      ctx.arc(612 + i * 16, y + 44, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    label(ctx, upgrade.blurb, 602, y + 68, 11.5, INK.textDim, 'left', 600);
    if (maxed) {
      label(ctx, 'MAXED', 884, y + 47, 13, INK.calm, 'center', 800);
    } else {
      const afford = data.cash >= price;
      button(830, y + 26, 88, 42, money(price), () => {
        if (save.cash >= price && save.upgrades[key] < 3) {
          save.cash -= price;
          save.upgrades[key] += 1;
          storeSave(save);
        }
      }, { size: 13.5, colour: afford ? INK.goldSoft : INK.textDim, edge: afford ? INK.gold : INK.panelEdge });
    }
  });

  label(ctx, 'Guards and cameras fill the alarm when they see you — break line of sight behind cases and shelves.', 24, VIEW.height - 18, 12, INK.textDim, 'left', 600);
  if (input.wasTapped('1') && data.unlocked >= 1) startJob(0);
  if (input.wasTapped('2') && data.unlocked >= 2) startJob(1);
  if (input.wasTapped('3') && data.unlocked >= 3) startJob(2);
}

/** The results panel: how the night ended, and what it paid. */
function drawResults() {
  drawWorld(ctx, world, performance.now() / 1000);
  ctx.fillStyle = 'rgba(5, 7, 13, 0.62)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const w = 540;
  const x = VIEW.width / 2 - w / 2;
  const y = 92;
  ctx.fillStyle = INK.panel;
  roundRect(ctx, x, y, w, 416, 12);
  ctx.fill();
  ctx.strokeStyle = INK.panelEdge;
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, 416, 12);
  ctx.stroke();

  if (results.escaped) {
    label(ctx, 'CLEAN GETAWAY', VIEW.width / 2, y + 44, 30, INK.calm, 'center', 800);
    label(ctx, results.grade, VIEW.width / 2, y + 118, 74, INK.gold, 'center', 800);
    if (results.isBest) label(ctx, 'a new best for this venue', VIEW.width / 2, y + 162, 13, INK.goldSoft);
  } else {
    label(ctx, 'BUSTED', VIEW.width / 2, y + 44, 32, INK.danger, 'center', 800);
    label(ctx, results.reason === 'cordon' ? 'The police cordon closed before you reached the van.' : 'A guard got hands on you. The take is gone.', VIEW.width / 2, y + 84, 14, INK.text);
  }
  const rows = [
    ['Loot carried out', money(results.value)],
    ['Share of the venue', `${Math.round(results.share * 100)}%`],
    ['Time inside', `${Math.floor(results.seconds / 60)}:${Math.floor(results.seconds % 60).toString().padStart(2, '0')}`],
    ['Times the alarm rose', `${results.spotted}`],
    ['Paid into the stash', results.escaped ? money(results.value) : money(0)],
  ];
  rows.forEach(([name, value], i) => {
    const ry = y + (results.escaped ? 196 : 128) + i * 32;
    label(ctx, name, x + 36, ry, 14.5, INK.textDim, 'left', 600);
    label(ctx, value, x + w - 36, ry, 14.5, INK.text, 'right', 800);
  });
  button(x + 36, y + 348, 200, 46, 'RETRY JOB  (R)', () => startJob(levelIndex), { size: 14 });
  button(x + w - 236, y + 348, 200, 46, 'HIDEOUT  (H)', () => {
    screen = 'hideout';
  }, { size: 14 });
  if (input.wasTapped('r')) startJob(levelIndex);
  if (input.wasTapped('h')) screen = 'hideout';
}

/** The pause overlay: the job freezes, the plan can be reconsidered. */
function drawPause() {
  ctx.fillStyle = 'rgba(5, 7, 13, 0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const w = 340;
  const x = VIEW.width / 2 - w / 2;
  const y = 168;
  ctx.fillStyle = INK.panel;
  roundRect(ctx, x, y, w, 264, 12);
  ctx.fill();
  ctx.strokeStyle = INK.panelEdge;
  roundRect(ctx, x, y, w, 264, 12);
  ctx.stroke();
  label(ctx, 'PAUSED', VIEW.width / 2, y + 38, 24, INK.text, 'center', 800);
  button(x + 40, y + 70, w - 80, 44, 'RESUME  (P)', () => {
    paused = false;
  });
  button(x + 40, y + 126, w - 80, 44, 'RESTART JOB  (R)', () => startJob(levelIndex));
  button(x + 40, y + 182, w - 80, 44, 'ABANDON TO HIDEOUT', () => {
    screen = 'hideout';
    paused = false;
  });
  label(ctx, `Sound: ${audio.isMuted() ? 'off' : 'on'} — M to toggle`, VIEW.width / 2, y + 246, 12, INK.textDim);
}

/** Draw the staged screenshot scene, frozen exactly as arranged. */
function drawShot(now) {
  if (staged.screen === 'hideout') {
    drawHideout(staged.save);
  } else {
    drawWorld(ctx, staged.world, now);
  }
  window.__shotReady = true;
}

let last = performance.now();
function frame(nowMs) {
  const now = nowMs / 1000;
  const dt = Math.min(0.05, (nowMs - last) / 1000);
  last = nowMs;
  handleClicks();
  hitboxes = [];
  if (staged) {
    drawShot(now);
  } else if (screen === 'title') {
    drawTitle(now);
  } else if (screen === 'hideout') {
    drawHideout(save);
  } else if (screen === 'play') {
    stepPlay(dt);
    drawWorld(ctx, world, now);
    if (paused) drawPause();
  } else if (screen === 'results') {
    drawResults();
  }
  input.endFrame();
  requestAnimationFrame(frame);
}

// A small handle for automated play-tests: read-only state, no cheats.
window.__heist = {
  get screen() {
    return screen;
  },
  get world() {
    return world;
  },
  get save() {
    return save;
  },
  startJob,
};

requestAnimationFrame(frame);

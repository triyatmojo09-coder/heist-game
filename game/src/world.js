// Midnight Heist: the job itself — movement, patrols, vision, loot, the vault
// crack and the police response clock. One job: the simulation, no drawing.

import { TILE, gearFor } from './config.js';
import { LOOT_TYPES, isSolid } from './levels.js';

const WALK_TILES = 3.4; // tiles per second, unladen
const SPRINT_MULT = 1.35;
const BAG_SLOW = 0.08; // each carried bag slows the thief this much
const GUARD_RANGE = 4.6; // tiles a guard can see
const GUARD_HALF_ANGLE = 0.62; // radians either side of facing
const CAMERA_RANGE = 5.0;
const CAMERA_HALF_ANGLE = 0.5;
const CATCH_DIST = 0.55; // tiles: a guard this close ends the job
const JAM_SECONDS = 6;

function tileCenter(tx, ty) {
  return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

/** A fresh job in a venue, with the crew's current gear. */
export class HeistWorld {
  constructor(level, upgrades, seed) {
    this.level = level;
    this.gear = gearFor(upgrades);
    this.seed = seed >>> 0;
    this.time = 0;
    this.status = 'playing'; // playing | escaped | busted
    this.bustReason = null; // 'caught' | 'cordon'
    this.clock = level.responseSeconds;
    this.heat = 0; // 0..100 alarm meter
    this.spotted = 0;
    this.events = [];
    this.notice = '';
    this.noticeUntil = 0;

    this.doorsOpen = new Set();
    this.pickProgress = new Map();
    this.vaultOpen = false;
    this.minigame = null; // { tumbler, needle, dir, zoneStart, zoneWidth }
    this.jammerCharges = this.gear.jammerCharges;
    this.jammedUntil = -1;
    this.escapeProgress = 0;

    this.loot = [];
    this.totalLootValue = 0;
    this.carriedValue = 0;
    this.carriedBags = 0;
    this.vanTiles = [];
    let start = { x: 1, y: 1 };

    level.map.forEach((row, ty) => {
      for (let tx = 0; tx < row.length; tx += 1) {
        const ch = row[tx];
        if (ch === 'P') start = tileCenter(tx, ty);
        if (ch === 'X') this.vanTiles.push({ tx, ty });
        if (LOOT_TYPES[ch]) {
          const kind = LOOT_TYPES[ch];
          this.loot.push({ tx, ty, ...kind, taken: false });
          this.totalLootValue += kind.value;
        }
      }
    });

    this.player = { x: start.x, y: start.y, r: 11, facing: -Math.PI / 2 };

    this.guards = level.guards.map((g) => {
      const first = tileCenter(g.path[0][0], g.path[0][1]);
      return {
        path: g.path.map(([tx, ty]) => tileCenter(tx, ty)),
        waypoint: 1 % g.path.length,
        speed: g.speed,
        x: first.x,
        y: first.y,
        facing: 0,
        suspicion: 0,
        chaseUntil: -1,
        lostSightFor: 0,
        mode: 'patrol', // patrol | chase
      };
    });

    this.cameras = level.cameras.map((c) => ({ ...c }));
  }

  tileAt(px, py) {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (ty < 0 || ty >= this.level.map.length) return '#';
    const row = this.level.map[ty];
    if (tx < 0 || tx >= row.length) return '#';
    return row[tx];
  }

  solidAt(px, py, isGuard) {
    const tile = this.tileAt(px, py);
    const key = `${Math.floor(px / TILE)},${Math.floor(py / TILE)}`;
    return isSolid(tile, this.doorsOpen.has(key), this.vaultOpen, isGuard);
  }

  /** True when no wall, cover or shut door stands between the two points. */
  lineOfSight(ax, ay, bx, by) {
    const dist = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(1, Math.ceil(dist / 8));
    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      const tile = this.tileAt(ax + (bx - ax) * t, ay + (by - ay) * t);
      if (tile === '#' || tile === 'C') return false;
      if (tile === 'D') {
        const key = `${Math.floor(ax + (bx - ax) * t)},${Math.floor(ay + (by - ay) * t)}`;
        if (!this.doorsOpen.has(key)) return false;
      }
      if (tile === 'V' && !this.vaultOpen) return false;
    }
    return true;
  }

  sees(fromX, fromY, facing, range, halfAngle) {
    const dx = this.player.x - fromX;
    const dy = this.player.y - fromY;
    const dist = Math.hypot(dx, dy);
    if (dist > range * TILE) return false;
    if (dist > 4 && angleDiff(Math.atan2(dy, dx), facing) > halfAngle) return false;
    return this.lineOfSight(fromX, fromY, this.player.x, this.player.y);
  }

  /** The tile the thief stands on, and its four neighbours. */
  playerTile() {
    return { tx: Math.floor(this.player.x / TILE), ty: Math.floor(this.player.y / TILE) };
  }

  neighbourTile(dx, dy) {
    const { tx, ty } = this.playerTile();
    const nx = tx + dx;
    const ny = ty + dy;
    if (ny < 0 || ny >= this.level.map.length) return { tx: nx, ty: ny, ch: '#' };
    const row = this.level.map[ny];
    if (nx < 0 || nx >= row.length) return { tx: nx, ty: ny, ch: '#' };
    return { tx: nx, ty: ny, ch: row[nx] };
  }

  flashNotice(text) {
    this.notice = text;
    this.noticeUntil = this.time + 1.6;
  }

  lootShare() {
    return this.totalLootValue === 0 ? 0 : this.carriedValue / this.totalLootValue;
  }

  step(dt, input) {
    if (this.status !== 'playing') return;
    this.time += dt;

    // The vault crack: a sweeping needle, three tumblers to land in the green.
    if (this.minigame) {
      this.stepMinigame(dt, input);
    } else {
      this.stepMovement(dt, input);
      this.stepDoors(dt, input);
      this.stepLoot();
      this.stepVan(dt);
    }

    this.stepGuards(dt);
    this.stepCameras(dt, input);

    // Heat cools slowly; the clock drains faster while the alarm is hot.
    this.heat = Math.max(0, this.heat - dt * 1.6);
    this.clock -= dt * (1 + this.heat / 60);
    if (this.clock <= 0) {
      this.clock = 0;
      this.status = 'busted';
      this.bustReason = 'cordon';
      this.events.push('alarm');
    }
    if (this.time > this.noticeUntil) this.notice = '';
  }

  stepMovement(dt, input) {
    const slow = 1 / (1 + BAG_SLOW * this.carriedBags);
    const speed = WALK_TILES * TILE * (input.sprint ? SPRINT_MULT : 1) * slow;
    let mx = input.moveX;
    let my = input.moveY;
    const len = Math.hypot(mx, my);
    if (len > 0) {
      mx /= len;
      my /= len;
      this.player.facing = Math.atan2(my, mx);
    }
    this.moveAxis(mx * speed * dt, 0, false);
    this.moveAxis(0, my * speed * dt, false);
  }

  moveAxis(dx, dy, isGuard) {
    const p = this.player;
    const nx = p.x + dx;
    const ny = p.y + dy;
    const r = p.r;
    const corners = [
      [nx - r, ny - r],
      [nx + r, ny - r],
      [nx - r, ny + r],
      [nx + r, ny + r],
    ];
    if (!corners.some(([cx, cy]) => this.solidAt(cx, cy, isGuard))) {
      p.x = nx;
      p.y = ny;
      return;
    }
    if (!isGuard) this.trySlide(dx, dy);
  }

  /** When a move is blocked, slide sideways toward the centre of the opening
   * the thief is pushing into, so a 1-tile gap never wedges them on its edge. */
  trySlide(dx, dy) {
    const p = this.player;
    const r = p.r;
    const nx = p.x + dx;
    const ny = p.y + dy;
    const freeAt = (x, y) => {
      const corners = [
        [x - r, y - r],
        [x + r, y - r],
        [x - r, y + r],
        [x + r, y + r],
      ];
      return !corners.some(([cx, cy]) => this.solidAt(cx, cy, false));
    };
    if (dy !== 0) {
      // Moving vertically: nudge x toward the centre of an open column ahead.
      const edgeY = ny + Math.sign(dy) * r;
      const baseCol = Math.floor(p.x / TILE);
      for (const col of [baseCol, baseCol - 1, baseCol + 1]) {
        const centreX = (col + 0.5) * TILE;
        if (Math.abs(centreX - p.x) > 20) continue;
        if (this.solidAt(centreX, edgeY, false)) continue;
        const nudge = Math.max(-4, Math.min(4, centreX - p.x));
        if (freeAt(p.x + nudge, ny)) {
          p.x += nudge;
          p.y = ny;
          return;
        }
        if (freeAt(p.x + nudge, p.y)) {
          p.x += nudge; // slide along the wall toward the gap
          return;
        }
      }
      return;
    }
    // Moving horizontally: nudge y toward the centre of an open row ahead.
    const edgeX = nx + Math.sign(dx) * r;
    const baseRow = Math.floor(p.y / TILE);
    for (const row of [baseRow, baseRow - 1, baseRow + 1]) {
      const centreY = (row + 0.5) * TILE;
      if (Math.abs(centreY - p.y) > 20) continue;
      if (this.solidAt(edgeX, centreY, false)) continue;
      const nudge = Math.max(-4, Math.min(4, centreY - p.y));
      if (freeAt(nx, p.y + nudge)) {
        p.x = nx;
        p.y += nudge;
        return;
      }
      if (freeAt(p.x, p.y + nudge)) {
        p.y += nudge; // slide along the wall toward the gap
        return;
      }
    }
  }

  stepDoors(dt, input) {
    // Standing by the vault and tapping E starts the crack.
    const vault = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dx, dy]) => this.neighbourTile(dx, dy))
      .find((n) => n.ch === 'V');
    if (vault && !this.vaultOpen && input.interactPressed) {
      this.minigame = { tumbler: 0, needle: 0, dir: 1, zoneStart: 0.55, zoneWidth: 0.24 };
      this.events.push('click');
    }
    const closed = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = this.neighbourTile(dx, dy);
      if (n.ch === 'D' && !this.doorsOpen.has(`${n.tx},${n.ty}`)) closed.push(n);
    }
    if (closed.length === 0) return;
    const door = closed[0];
    const key = `${door.tx},${door.ty}`;
    if (input.interactDown) {
      const progress = (this.pickProgress.get(key) || 0) + dt;
      this.pickProgress.set(key, progress);
      if (progress >= this.gear.pickSeconds) {
        this.doorsOpen.add(key);
        this.pickProgress.delete(key);
        this.events.push('click');
        this.flashNotice('Door picked');
      }
    } else {
      this.pickProgress.set(key, Math.max(0, (this.pickProgress.get(key) || 0) - dt * 2));
    }
  }

  stepMinigame(dt, input) {
    const mg = this.minigame;
    mg.needle += mg.dir * dt * 1.15;
    if (mg.needle >= 1) {
      mg.needle = 1;
      mg.dir = -1;
    }
    if (mg.needle <= 0) {
      mg.needle = 0;
      mg.dir = 1;
    }
    if (input.cancelPressed) {
      this.minigame = null;
      return;
    }
    if (!input.interactPressed) return;
    const inZone = mg.needle >= mg.zoneStart && mg.needle <= mg.zoneStart + mg.zoneWidth;
    if (inZone) {
      mg.tumbler += 1;
      this.events.push('tumbler');
      if (mg.tumbler >= 3) {
        this.vaultOpen = true;
        this.minigame = null;
        this.events.push('vault');
        this.flashNotice('Vault open — clean it out!');
        return;
      }
      // Next tumbler: a narrower window somewhere new.
      mg.zoneWidth = Math.max(0.13, mg.zoneWidth - 0.04);
      mg.zoneStart = 0.08 + Math.random() * (0.92 - mg.zoneWidth - 0.08);
      mg.needle = 0;
      mg.dir = 1;
    } else {
      this.heat = Math.min(100, this.heat + 8);
      this.events.push('noise');
      this.flashNotice('Wrong tumbler — the alarm heard that');
      mg.needle = 0;
      mg.dir = 1;
    }
  }

  stepLoot() {
    const { tx, ty } = this.playerTile();
    const item = this.loot.find((l) => !l.taken && l.tx === tx && l.ty === ty);
    if (!item) return;
    if (this.carriedBags + item.bags > this.gear.bagSlots) {
      this.flashNotice(`Bag full — ${this.gear.bagSlots} slots, carrying ${this.carriedBags}`);
      return;
    }
    item.taken = true;
    this.carriedBags += item.bags;
    this.carriedValue += item.value;
    this.events.push('pickup');
  }

  stepVan(dt) {
    const { tx, ty } = this.playerTile();
    const onVan = this.vanTiles.some((v) => v.tx === tx && v.ty === ty);
    if (!onVan) {
      this.escapeProgress = 0;
      return;
    }
    this.escapeProgress += dt;
    if (this.escapeProgress >= 0.8) {
      this.status = 'escaped';
      this.events.push('escaped');
    }
  }

  stepGuards(dt) {
    for (const guard of this.guards) {
      const alertSpeed = this.heat >= 75 ? 1.25 : 1;
      const seen = this.sees(guard.x, guard.y, guard.facing, GUARD_RANGE, GUARD_HALF_ANGLE);
      if (seen) {
        guard.suspicion = Math.min(1, guard.suspicion + dt * 1.25);
        guard.lostSightFor = 0;
        if (guard.suspicion >= 1 && guard.mode !== 'chase') {
          guard.mode = 'chase';
          guard.chaseUntil = this.time + 5;
          this.spotted += 1;
          this.heat = Math.min(100, this.heat + 30);
          this.events.push('alarm');
          this.flashNotice('Spotted! Lose the guard and move');
        }
      } else {
        guard.suspicion = Math.max(0, guard.suspicion - dt * 0.45);
        if (guard.mode === 'chase') {
          guard.lostSightFor += dt;
          if (guard.lostSightFor > 2 || this.time > guard.chaseUntil) {
            guard.mode = 'patrol';
            guard.lostSightFor = 0;
          }
        }
      }

      // Walk the patrol loop, or run the thief down while chasing.
      let target;
      if (guard.mode === 'chase') {
        target = { x: this.player.x, y: this.player.y };
      } else {
        target = guard.path[guard.waypoint];
      }
      const dx = target.x - guard.x;
      const dy = target.y - guard.y;
      const dist = Math.hypot(dx, dy);
      const speed = TILE * 1.55 * guard.speed * alertSpeed * (guard.mode === 'chase' ? 1.5 : 1);
      if (dist > 2) {
        const stepLen = Math.min(dist, speed * dt);
        const nx = guard.x + (dx / dist) * stepLen;
        const ny = guard.y + (dy / dist) * stepLen;
        if (!this.solidAt(nx, ny, true) && !this.solidAt(nx, guard.y, true) && !this.solidAt(guard.x, ny, true)) {
          guard.x = nx;
          guard.y = ny;
        }
        guard.facing = Math.atan2(dy, dx);
      }
      if (guard.mode === 'patrol' && dist < 6) {
        guard.waypoint = (guard.waypoint + 1) % guard.path.length;
      }

      // Caught: a guard close enough to grab the thief ends the job.
      if (Math.hypot(this.player.x - guard.x, this.player.y - guard.y) < CATCH_DIST * TILE) {
        this.status = 'busted';
        this.bustReason = 'caught';
        this.events.push('busted');
      }
    }
  }

  stepCameras(dt, input) {
    if (input.jammerPressed && this.jammerCharges > 0 && this.time >= this.jammedUntil) {
      this.jammerCharges -= 1;
      this.jammedUntil = this.time + JAM_SECONDS;
      this.events.push('jam');
      this.flashNotice('Cameras jammed — move now');
    }
    if (this.time < this.jammedUntil) return;
    for (const camera of this.cameras) {
      const angle = camera.angle + Math.sin((this.time / camera.period) * Math.PI * 2 + camera.phase) * camera.sweep;
      const centre = tileCenter(camera.tx, camera.ty);
      if (this.sees(centre.x, centre.y, angle, CAMERA_RANGE, CAMERA_HALF_ANGLE)) {
        this.heat = Math.min(100, this.heat + dt * 14);
        if (this.heat >= 60 && !camera.alarmed) {
          camera.alarmed = true;
          this.spotted += 1;
          this.events.push('alarm');
          this.flashNotice('Camera has you — break line of sight');
        }
      } else if (this.heat < 40) {
        camera.alarmed = false;
      }
    }
  }
}

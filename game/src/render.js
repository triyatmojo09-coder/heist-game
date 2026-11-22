// Midnight Heist: everything the job looks like.
// One job: draw the world, the HUD and the vault-crack overlay on the canvas.

import { INK, MAP_X, MAP_Y, TILE, VIEW, clockText, money } from './config.js';
import { LOOT_TYPES } from './levels.js';

export function label(ctx, text, x, y, size, colour, align = 'center', weight = 600) {
  ctx.fillStyle = colour;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function toScreen(px, py) {
  return { x: MAP_X + px, y: MAP_Y + py };
}

function drawCone(ctx, x, y, facing, range, halfAngle, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, facing - halfAngle, facing + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawTileFloor(ctx, tx, ty, ch) {
  const x = MAP_X + tx * TILE;
  const y = MAP_Y + ty * TILE;
  if (ch === ',') {
    ctx.fillStyle = INK.street;
    ctx.fillRect(x, y, TILE, TILE);
    // Faint road dashes on the street outside.
    if (ty % 2 === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.fillRect(x + 12, y + TILE / 2 - 1, 8, 2);
    }
    return;
  }
  ctx.fillStyle = (tx + ty) % 2 === 0 ? INK.floor : INK.floorAlt;
  ctx.fillRect(x, y, TILE, TILE);
  if (ch === 'u') {
    ctx.fillStyle = '#0b0f1a';
    ctx.fillRect(x + 6, y + 6, TILE - 12, TILE - 12);
    ctx.strokeStyle = '#5a6a8a';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 6, y + 6, TILE - 12, TILE - 12);
    ctx.beginPath();
    for (let i = 1; i < 3; i += 1) {
      ctx.moveTo(x + 6, y + 6 + i * 7);
      ctx.lineTo(x + TILE - 6, y + 6 + i * 7);
    }
    ctx.stroke();
  }
}

function drawLoot(ctx, item, now) {
  const { x, y } = toScreen((item.tx + 0.5) * TILE, (item.ty + 0.5) * TILE);
  const bob = Math.sin(now * 2.4 + item.tx) * 2;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.rotate(Math.PI / 4);
  const size = item.bags === 2 ? 11 : 9;
  ctx.fillStyle = item.tx % 2 === 0 ? INK.gold : INK.goldSoft;
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.strokeStyle = '#8a6a10';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-size / 2, -size / 2, size, size);
  ctx.restore();
  label(ctx, money(item.value), x, y + 15, 9, INK.goldSoft);
}

function drawGuard(ctx, guard) {
  const { x, y } = toScreen(guard.x, guard.y);
  const range = 4.6 * TILE;
  drawCone(ctx, x, y, guard.facing, range, 0.62, INK.cone, INK.coneEdge);
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fillStyle = guard.mode === 'chase' ? '#ff2e2e' : INK.guard;
  ctx.fill();
  ctx.strokeStyle = '#7a1010';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Eyes look where the guard looks.
  const ex = Math.cos(guard.facing) * 4;
  const ey = Math.sin(guard.facing) * 4;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + ex - 3, y + ey - 2, 2.2, 0, Math.PI * 2);
  ctx.arc(x + ex + 3, y + ey - 2, 2.2, 0, Math.PI * 2);
  ctx.fill();
  if (guard.suspicion > 0.05 && guard.mode !== 'chase') {
    label(ctx, guard.suspicion > 0.7 ? '!' : '?', x, y - 24, 18, guard.suspicion > 0.7 ? INK.danger : INK.goldSoft, 'center', 800);
  }
  if (guard.mode === 'chase') {
    label(ctx, '!', x, y - 24, 20, INK.danger, 'center', 800);
  }
}

function drawCamera(ctx, camera, now, jammed) {
  const cx = MAP_X + (camera.tx + 0.5) * TILE;
  const cy = MAP_Y + (camera.ty + 0.5) * TILE;
  const angle = camera.angle + Math.sin((now / camera.period) * Math.PI * 2 + camera.phase) * camera.sweep;
  if (!jammed) {
    drawCone(ctx, cx, cy, angle, 5.0 * TILE, 0.5, INK.camCone, INK.camEdge);
  }
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.fillStyle = jammed ? '#3a4358' : '#c22';
  roundRect(ctx, -3, -6, 16, 12, 3);
  ctx.fill();
  ctx.fillStyle = jammed ? '#222' : '#ff5d5d';
  ctx.beginPath();
  ctx.arc(14, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHud(ctx, world) {
  const level = world.level;
  ctx.fillStyle = '#0a0e1a';
  ctx.fillRect(0, 0, VIEW.width, 40);
  ctx.fillStyle = level.accent;
  ctx.fillRect(0, 40, VIEW.width, 2);
  label(ctx, level.name.toUpperCase(), 16, 20, 15, INK.text, 'left', 800);

  const low = world.clock < 45;
  label(ctx, `POLICE ${clockText(world.clock)}`, VIEW.width / 2, 20, 17, low ? INK.danger : INK.text, 'center', 800);

  // Alarm meter.
  const bx = VIEW.width - 320;
  label(ctx, 'ALARM', bx - 8, 20, 11, INK.textDim, 'right', 700);
  ctx.fillStyle = '#1d2740';
  roundRect(ctx, bx, 12, 130, 16, 8);
  ctx.fill();
  ctx.fillStyle = world.heat > 60 ? INK.danger : world.heat > 30 ? INK.alarm : INK.calm;
  if (world.heat > 1) {
    roundRect(ctx, bx, 12, Math.max(12, (130 * world.heat) / 100), 16, 8);
    ctx.fill();
  }

  label(ctx, `${money(world.carriedValue)} · ${world.carriedBags}/${world.gear.bagSlots} bags`, VIEW.width - 16, 20, 13, INK.goldSoft, 'right', 700);

  // Bottom hint bar.
  ctx.fillStyle = 'rgba(10, 14, 26, 0.9)';
  ctx.fillRect(0, VIEW.height - 22, VIEW.width, 22);
  const jam = world.time < world.jammedUntil ? 'cameras JAMMED' : `Q jammer ×${world.jammerCharges}`;
  label(
    ctx,
    world.notice || `WASD move · Shift run · E use / pick / crack · ${jam} · P pause · M mute`,
    VIEW.width / 2,
    VIEW.height - 11,
    11.5,
    world.notice ? INK.alarm : INK.textDim,
  );
}

function drawMinigame(ctx, world) {
  const mg = world.minigame;
  ctx.fillStyle = 'rgba(5, 7, 13, 0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const w = 460;
  const h = 190;
  const x = VIEW.width / 2 - w / 2;
  const y = VIEW.height / 2 - h / 2;
  ctx.fillStyle = INK.panel;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = INK.panelEdge;
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 12);
  ctx.stroke();
  label(ctx, 'CRACK THE VAULT', VIEW.width / 2, y + 30, 20, INK.gold, 'center', 800);
  label(ctx, `Tumbler ${mg.tumbler + 1} of 3 — press E when the needle is in the green`, VIEW.width / 2, y + 56, 12.5, INK.textDim);
  const trackX = x + 40;
  const trackW = w - 80;
  const trackY = y + 108;
  ctx.fillStyle = '#0b0f1a';
  roundRect(ctx, trackX, trackY - 8, trackW, 16, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(127, 224, 138, 0.55)';
  ctx.fillRect(trackX + mg.zoneStart * trackW, trackY - 8, mg.zoneWidth * trackW, 16);
  ctx.fillStyle = INK.gold;
  ctx.fillRect(trackX + mg.needle * trackW - 2, trackY - 14, 4, 28);
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(x + w / 2 - 24 + i * 24, y + 152, 7, 0, Math.PI * 2);
    ctx.fillStyle = i < mg.tumbler ? INK.calm : '#2a3350';
    ctx.fill();
  }
  label(ctx, 'Esc cancels', VIEW.width / 2, y + h - 16, 11, INK.textDim);
}

/** Draw one frame of a job: map, cones, loot, thief, HUD, minigame. */
export function drawWorld(ctx, world, now) {
  const level = world.level;
  ctx.fillStyle = INK.night;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  // Floors first, so cones and actors draw over them.
  level.map.forEach((row, ty) => {
    for (let tx = 0; tx < row.length; tx += 1) {
      drawTileFloor(ctx, tx, ty, row[tx]);
    }
  });

  // The getaway van: two street tiles, outlined green, with a beacon.
  for (const v of world.vanTiles) {
    const x = MAP_X + v.tx * TILE;
    const y = MAP_Y + v.ty * TILE;
    ctx.fillStyle = INK.van;
    roundRect(ctx, x + 2, y + 4, TILE - 4, TILE - 8, 5);
    ctx.fill();
    ctx.fillStyle = '#0b3d1e';
    ctx.fillRect(x + 8, y + 9, 8, 8);
    ctx.fillRect(x + 18, y + 9, 8, 8);
    label(ctx, 'VAN', x + TILE / 2, y + TILE - 7, 9, '#d9ffe8', 'center', 800);
  }

  // Walls, cover, doors and the vault door.
  level.map.forEach((row, ty) => {
    for (let tx = 0; tx < row.length; tx += 1) {
      const ch = row[tx];
      const x = MAP_X + tx * TILE;
      const y = MAP_Y + ty * TILE;
      if (ch === '#') {
        ctx.fillStyle = INK.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = INK.wallTop;
        ctx.fillRect(x, y, TILE, 4);
      } else if (ch === 'C') {
        ctx.fillStyle = INK.cover;
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.fillStyle = INK.coverTop;
        ctx.fillRect(x + 2, y + 2, TILE - 4, 4);
      } else if (ch === 'D') {
        const open = world.doorsOpen.has(`${tx},${ty}`);
        ctx.fillStyle = open ? '#233048' : '#6b4a1f';
        ctx.fillRect(x + 3, y, TILE - 6, TILE);
        if (!open) {
          ctx.fillStyle = INK.gold;
          ctx.beginPath();
          ctx.arc(x + TILE / 2, y + TILE / 2, 3.5, 0, Math.PI * 2);
          ctx.fill();
          const progress = world.pickProgress.get(`${tx},${ty}`) || 0;
          if (progress > 0) {
            ctx.fillStyle = '#1d2740';
            ctx.fillRect(x + 2, y - 7, TILE - 4, 4);
            ctx.fillStyle = INK.gold;
            ctx.fillRect(x + 2, y - 7, (TILE - 4) * (progress / world.gear.pickSeconds), 4);
          }
        }
      } else if (ch === 'V') {
        ctx.fillStyle = world.vaultOpen ? '#233048' : '#4a4a55';
        ctx.fillRect(x, y, TILE, TILE);
        if (!world.vaultOpen) {
          ctx.strokeStyle = INK.gold;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x + TILE / 2, y + TILE / 2, 9, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + TILE / 2 - 5, y + TILE / 2);
          ctx.lineTo(x + TILE / 2 + 5, y + TILE / 2);
          ctx.moveTo(x + TILE / 2, y + TILE / 2 - 5);
          ctx.lineTo(x + TILE / 2, y + TILE / 2 + 5);
          ctx.stroke();
          label(ctx, 'VAULT', x + TILE / 2, y + TILE / 2 + 14, 8, INK.goldSoft, 'center', 800);
        }
      }
    }
  });

  for (const item of world.loot) {
    if (!item.taken) drawLoot(ctx, item, now);
  }

  const jammed = world.time < world.jammedUntil;
  for (const camera of world.cameras) drawCamera(ctx, camera, now, jammed);
  for (const guard of world.guards) drawGuard(ctx, guard);

  // The thief: a hooded figure, gold, facing where they move.
  const { x, y } = toScreen(world.player.x, world.player.y);
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.fillStyle = INK.player;
  ctx.fill();
  ctx.strokeStyle = '#7a5c00';
  ctx.lineWidth = 2;
  ctx.stroke();
  const fx = Math.cos(world.player.facing) * 6;
  const fy = Math.sin(world.player.facing) * 6;
  ctx.fillStyle = '#1b2133';
  ctx.beginPath();
  ctx.arc(x + fx - 3, y + fy - 2, 2, 0, Math.PI * 2);
  ctx.arc(x + fx + 3, y + fy - 2, 2, 0, Math.PI * 2);
  ctx.fill();
  // The bag load rides on the thief's back.
  if (world.carriedBags > 0) {
    ctx.fillStyle = '#8a6a10';
    ctx.beginPath();
    ctx.arc(x - fx * 0.8, y - fy * 0.8, 5 + Math.min(3, world.carriedBags), 0, Math.PI * 2);
    ctx.fill();
  }
  if (world.escapeProgress > 0) {
    ctx.strokeStyle = INK.calm;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 17, -Math.PI / 2, -Math.PI / 2 + (world.escapeProgress / 0.8) * Math.PI * 2);
    ctx.stroke();
  }

  drawHud(ctx, world);
  if (world.minigame) drawMinigame(ctx, world);
}

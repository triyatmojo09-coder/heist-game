// Midnight Heist: staged scenes for the screenshots.
// One job: build a world frozen mid-moment, so each shot shows the game at
// its best — vault, cones, loot and the response clock in one frame.

import { LEVELS } from './levels.js';
import { HeistWorld } from './world.js';

function takeSome(world, count) {
  let taken = 0;
  for (const item of world.loot) {
    if (taken >= count) break;
    if (world.carriedBags + item.bags > world.gear.bagSlots) continue;
    item.taken = true;
    world.carriedBags += item.bags;
    world.carriedValue += item.value;
    taken += 1;
  }
}

function placeGuard(world, index, tx, ty, facingTx, facingTy, suspicion) {
  const guard = world.guards[index];
  guard.x = (tx + 0.5) * 32;
  guard.y = (ty + 0.5) * 32;
  guard.facing = Math.atan2((facingTy + 0.5) * 32 - guard.y, (facingTx + 0.5) * 32 - guard.x);
  guard.suspicion = suspicion;
}

/** A staged scene: { screen, world, save }. The world is drawn, never stepped. */
export function stageShot(name) {
  if (name === 'cover') {
    const world = new HeistWorld(LEVELS[0], { lockpick: 0, jammer: 0, bag: 0 }, 7);
    world.vaultOpen = true;
    world.time = 3.2;
    world.clock = 132;
    world.heat = 45;
    takeSome(world, 4);
    world.player.x = (18.5) * 32;
    world.player.y = (2.5) * 32;
    world.player.facing = 0;
    placeGuard(world, 0, 12, 5, 18, 2, 0.85);
    return { screen: 'play', world, save: null };
  }
  if (name === 'vault') {
    const world = new HeistWorld(LEVELS[1], { lockpick: 1, jammer: 0, bag: 0 }, 11);
    world.vaultOpen = true;
    world.time = 5.1;
    world.clock = 98;
    world.heat = 55;
    takeSome(world, 5);
    world.player.x = (18.5) * 32;
    world.player.y = (2.5) * 32;
    world.player.facing = Math.PI / 4;
    placeGuard(world, 0, 12, 3, 18, 2, 0.6);
    placeGuard(world, 1, 8, 6, 18, 2, 0.2);
    return { screen: 'play', world, save: null };
  }
  if (name === 'getaway') {
    const world = new HeistWorld(LEVELS[2], { lockpick: 1, jammer: 1, bag: 1 }, 23);
    world.time = 8.7;
    world.clock = 34;
    world.heat = 80;
    takeSome(world, 6);
    world.player.x = (11.5) * 32;
    world.player.y = (13.5) * 32;
    world.player.facing = -Math.PI / 2;
    world.escapeProgress = 0.55;
    placeGuard(world, 3, 12, 11, 11, 13, 1);
    world.guards[3].mode = 'chase';
    return { screen: 'play', world, save: null };
  }
  if (name === 'hideout') {
    return {
      screen: 'hideout',
      world: null,
      save: {
        cash: 4250,
        totalStolen: 12800,
        unlocked: 3,
        best: {
          jewellers: { value: 6500, lootShare: 0.72, grade: 'A', seconds: 121, spotted: 2 },
          bank: { value: 4200, lootShare: 0.41, grade: 'C', seconds: 188, spotted: 3 },
        },
        upgrades: { lockpick: 1, jammer: 2, bag: 1 },
      },
    };
  }
  return null;
}

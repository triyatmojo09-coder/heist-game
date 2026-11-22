// Midnight Heist: the three venues, drawn as tile maps.
//
// Map legend, one character per tile:
//   #  wall            .  floor             ,  street outside
//   X  the getaway van (stand here to escape)
//   P  the thief's starting tile
//   D  a locked door: solid until picked, then open for good
//   V  the vault door: solid until the crack minigame opens it
//   C  cover: a case, desk or shelf; solid, and it blocks sight
//   u  a duct grate in a wall: the thief crawls through, guards never do
//   G  a guard's first patrol tile (patrols are listed in map scan order)
//   l  small loot ($500, 1 bag)    L  display loot ($1,500, 1 bag)
//   A  artifact loot ($2,500, 1 bag)   B  bullion ($3,000, 2 bags)
//
// Guards walk the waypoint loop listed for them, in tile coordinates.
// Cameras sit on the wall tile named, face `angle` (radians, 0 = east,
// positive clockwise on screen), and sweep +/- `sweep` with the period given.

/** What each loot letter is worth and how much bag room it takes. */
export const LOOT_TYPES = {
  l: { value: 500, bags: 1, label: 'small valuables' },
  L: { value: 1500, bags: 1, label: 'a display piece' },
  A: { value: 2500, bags: 1, label: 'an artifact' },
  B: { value: 3000, bags: 2, label: 'bullion bars' },
};

/** Tiles that stop someone walking. Doors and the vault open once beaten. */
export function isSolid(tile, doorsOpen, vaultOpen, isGuard) {
  if (tile === '#' || tile === 'C') return true;
  if (tile === 'u') return isGuard; // ducts are the thief's shortcut only
  if (tile === 'D') return !doorsOpen;
  if (tile === 'V') return !vaultOpen;
  return false;
}

export const LEVELS = [
  {
    id: 'jewellers',
    name: 'Gilded Palm Jewellers',
    tagline: 'One guard, one camera, a back-room vault.',
    accent: '#f5c542',
    responseSeconds: 210,
    map: [
      '########################',
      '#l......#.l......#.....#',
      '#..CC.......C.C..V.B.B.#',
      '#.....l.#.....L..#.....#',
      '####.#######D##u########',
      '#......................#',
      '#......C........C......#',
      '#####D####u#########.###',
      '#..CCCC.......CCCC.....#',
      '#...L......CC...L......#',
      '#..G......L.........l..#',
      '#.....C..........C.....#',
      '###########.############',
      ',,,,,,,,,,XXP,,,,,,,,,,,',
      ',,,,,,,,,,,,,,,,,,,,,,,,',
    ],
    guards: [
      { path: [[3, 10], [20, 10], [20, 5], [3, 5]], speed: 1.0 },
    ],
    cameras: [
      { tx: 14, ty: 7, angle: Math.PI / 2, sweep: 0.55, period: 8, phase: 0 },
    ],
  },
  {
    id: 'bank',
    name: 'Meridian Trust Bank',
    tagline: 'Three guards, two cameras, a fat vault.',
    accent: '#7fd4ff',
    responseSeconds: 240,
    map: [
      '########################',
      '#.l...L.#.C..C.l.#.B...#',
      '#.G...............V..BA#',
      '#....l...L.......#.B...#',
      '####.#######D##u########',
      '#.l.G................L.#',
      '#.C..................C.#',
      '#####D######.######u####',
      '#...L.G.....l......L...#',
      '#.CCCC.CCCCCCCCCC.CCCC.#',
      '#..C................C..#',
      '#......................#',
      '###########..###########',
      ',,,,,,,,,,XXP,,,,,,,,,,,',
      ',,,,,,,,,,,,,,,,,,,,,,,,',
    ],
    guards: [
      { path: [[2, 2], [15, 2], [15, 3], [2, 3]], speed: 0.95 },
      { path: [[4, 5], [19, 5], [19, 6], [4, 6]], speed: 1.0 },
      { path: [[6, 8], [17, 8], [17, 10], [6, 10]], speed: 1.05 },
    ],
    cameras: [
      { tx: 10, ty: 7, angle: Math.PI / 2, sweep: 0.5, period: 8, phase: 1.5 },
      { tx: 16, ty: 4, angle: -Math.PI / 2, sweep: 0.45, period: 7.5, phase: 3 },
    ],
  },
  {
    id: 'museum',
    name: 'Aster Museum',
    tagline: 'Four guards, three cameras, the big one.',
    accent: '#d9a7ff',
    responseSeconds: 270,
    map: [
      '########################',
      '#.GA.....#..A..#.G..A..#',
      '#...C....#.B.B.#...C...#',
      '#.l......#.....#.....l.#',
      '####.#######V####u##.###',
      '#...G..........l.......#',
      '#.....A....CAC..A......#',
      '#.......C......C.......#',
      '#..............l.......#',
      '#####D######.#####u#####',
      '#..G.l............l....#',
      '#...........l..........#',
      '###########..###########',
      ',,,,,,,,,,XXP,,,,,,,,,,,',
      ',,,,,,,,,,,,,,,,,,,,,,,,',
    ],
    guards: [
      { path: [[2, 1], [6, 1], [6, 3], [2, 3]], speed: 1.0 },
      { path: [[17, 1], [21, 1], [21, 3], [17, 3]], speed: 1.0 },
      { path: [[4, 5], [19, 5], [19, 8], [4, 8]], speed: 1.05 },
      { path: [[3, 10], [20, 10], [20, 11], [3, 11]], speed: 0.95 },
    ],
    cameras: [
      { tx: 9, ty: 4, angle: Math.PI / 2, sweep: 0.6, period: 7, phase: 0 },
      { tx: 14, ty: 9, angle: -Math.PI / 2, sweep: 0.5, period: 8, phase: 2 },
      { tx: 9, ty: 2, angle: Math.PI, sweep: 0.4, period: 6, phase: 1 },
    ],
  },
];

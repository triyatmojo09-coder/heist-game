// Midnight Heist: shared tuning, palette and helpers.
// One job: the numbers and words every other module agrees on.

export const VIEW = { width: 960, height: 540 };
export const TILE = 32;
export const MAP_X = 96; // left edge of the tile map on the canvas
export const MAP_Y = 40; // top edge of the tile map on the canvas

export const INK = {
  night: '#070a12',
  floor: '#1b2133',
  floorAlt: '#171d2c',
  street: '#0e1420',
  wall: '#2e3a55',
  wallTop: '#42527a',
  cover: '#3a2f22',
  coverTop: '#5a4a33',
  text: '#e8ecf5',
  textDim: '#9aa5bd',
  gold: '#f5c542',
  goldSoft: '#ffd97a',
  calm: '#7fe08a',
  danger: '#ff5d5d',
  alarm: '#ff8a3d',
  cone: 'rgba(255, 214, 90, 0.16)',
  coneEdge: 'rgba(255, 214, 90, 0.5)',
  camCone: 'rgba(255, 93, 93, 0.14)',
  camEdge: 'rgba(255, 93, 93, 0.55)',
  panel: '#131a2b',
  panelEdge: '#33405f',
  van: '#3fae6a',
  player: '#ffd23e',
  guard: '#ff6b6b',
};

/** Gear sold in the hideout. prices[i] is the cost of the (i+1)th rank. */
export const UPGRADES = {
  lockpick: {
    name: 'Slim lockpicks',
    blurb: 'Pick locked doors much faster.',
    prices: [800, 1600, 3200],
  },
  jammer: {
    name: 'Camera jammer',
    blurb: '+1 jammer charge per job (Q to use).',
    prices: [1000, 2000, 4000],
  },
  bag: {
    name: 'Duffel bag',
    blurb: '+2 bag slots, so greed costs less speed.',
    prices: [1200, 2400, 4800],
  },
};

/** The three gear ranks change the job this way. */
export function gearFor(upgrades) {
  return {
    pickSeconds: Math.max(0.5, 1.7 - 0.4 * (upgrades.lockpick || 0)),
    jammerCharges: 1 + (upgrades.jammer || 0),
    bagSlots: 4 + 2 * (upgrades.bag || 0),
  };
}

/** Money, always with a $ and thousands separators. */
export function money(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

/** Grade from the share of the venue's loot carried out. */
export function gradeFor(share) {
  if (share >= 0.9) return 'S';
  if (share >= 0.7) return 'A';
  if (share >= 0.5) return 'B';
  if (share >= 0.3) return 'C';
  return 'D';
}

/** mm:ss for the response clock. */
export function clockText(seconds) {
  const left = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
}

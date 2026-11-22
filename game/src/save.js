// Midnight Heist: the crew's ledger between jobs.
// One job: load and store progress in localStorage, nothing else.

const KEY = 'midnight-heist-save-v1';

export function blankSave() {
  return {
    cash: 0,
    totalStolen: 0,
    unlocked: 1,
    best: {},
    upgrades: { lockpick: 0, jammer: 0, bag: 0 },
  };
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return blankSave();
    const parsed = JSON.parse(raw);
    const save = blankSave();
    if (typeof parsed.cash === 'number') save.cash = parsed.cash;
    if (typeof parsed.totalStolen === 'number') save.totalStolen = parsed.totalStolen;
    if (typeof parsed.unlocked === 'number') save.unlocked = parsed.unlocked;
    if (parsed.best && typeof parsed.best === 'object') save.best = parsed.best;
    if (parsed.upgrades && typeof parsed.upgrades === 'object') {
      for (const key of Object.keys(save.upgrades)) {
        if (typeof parsed.upgrades[key] === 'number') save.upgrades[key] = parsed.upgrades[key];
      }
    }
    return save;
  } catch {
    return blankSave();
  }
}

export function storeSave(save) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // A browser that refuses storage still plays; progress just does not keep.
  }
}

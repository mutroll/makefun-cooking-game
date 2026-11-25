// state.js — the whole run's state, and how a fresh shift starts.
// One clear job: facts about the game. No drawing, no input, no sound here.

export const DAY_LENGTH = 180; // seconds per shift
export const MAX_HEARTS = 3;
export const MAX_CARRY = 3;
export const MAX_ORDERS = 4;
export const CHOP_SECONDS = 0.6;
export const BURN_GRACE_SECONDS = 6;

export function createState() {
  return {
    screen: 'title', // 'title' | 'play' | 'results'
    paused: false,
    frozen: false, // shot mode: render a staged frame, never tick
    muted: false,
    time: 0, // seconds since the shift started
    coins: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    servedCount: 0,
    missedCount: 0,
    hearts: MAX_HEARTS,
    chef: { x: 640, y: 520, dir: 1, moving: false, walkPhase: 0, carry: [] },
    fridgeMenuOpen: false,
    chop: null, // { itemId, progress, total }
    burners: [
      { item: null, progress: 0, done: false, over: 0 },
      { item: null, progress: 0, done: false, over: 0 },
    ],
    plateSlots: [null, null], // { recipeId, placed: [itemId...], done: bool } | null
    counterItems: [], // ingredients set down on the middle counter
    orders: [], // { id, recipeId, patience, remaining, state }
    nextOrderId: 1,
    spawnIn: 2, // seconds until the next order arrives
    floats: [], // { x, y, text, color, life, maxLife }
    particles: [], // { x, y, vx, vy, color, life, maxLife, size }
    toast: '', // one-line hint near the bottom
    toastUntil: 0,
    rush: false,
    results: null, // { stars, ... } filled when the shift ends
    shotName: '',
  };
}

export function startShift(state) {
  const fresh = createState();
  fresh.screen = 'play';
  fresh.muted = state.muted;
  fresh.frozen = state.frozen;
  fresh.shotName = state.shotName;
  Object.assign(state, fresh);
}

export function dayTimeLeft(state) {
  return Math.max(0, DAY_LENGTH - state.time);
}

export function shiftOver(state) {
  return state.screen === 'results';
}

export function starsFor(coins) {
  if (coins >= 260) return 3;
  if (coins >= 170) return 2;
  if (coins >= 90) return 1;
  return 0;
}

// main.js — the loop, the input, and the stage directions.
// One clear job: run the game. Rules live in orders/interact, drawing in render.

import { createState, startShift, dayTimeLeft, DAY_LENGTH } from './state.js';
import { STATIONS, moveChef, updateParticles, nearestStation } from './kitchen.js';
import { interact, setDown, takeFromFridge, updateChop, updateStove, nearestStationOf } from './interact.js';
import { spawnOrder, updateOrders, finishShift } from './orders.js';
import { render, VIEW_W, VIEW_H } from './render.js';
import { SoundFX } from './audio.js';
import { RECIPES_BY_ID } from './recipes.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const state = createState();
const sfx = new SoundFX();

const keys = new Set();
let moveTarget = null;

function canvasPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * VIEW_W,
    y: ((clientY - rect.top) / rect.height) * VIEW_H,
  };
}

function update(dt) {
  if (state.screen === 'title' || state.screen === 'results') {
    state.time += dt; // keeps the title blink and results blink alive
    return;
  }
  if (state.paused) return;
  state.time += dt;

  // Movement: keys win over a mouse target; reaching the target clears it.
  let dx = 0;
  let dy = 0;
  if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
  if (keys.has('d') || keys.has('arrowright')) dx += 1;
  if (keys.has('w') || keys.has('arrowup')) dy -= 1;
  if (keys.has('s') || keys.has('arrowdown')) dy += 1;
  if (dx !== 0 || dy !== 0) {
    moveTarget = null;
    const len = Math.hypot(dx, dy);
    moveChef(state, dx / len, dy / len, dt);
  } else if (moveTarget) {
    const mx = moveTarget.x - state.chef.x;
    const my = moveTarget.y - state.chef.y;
    const dist = Math.hypot(mx, my);
    if (dist < 6) moveTarget = null;
    else moveChef(state, mx / dist, my / dist, dt);
  } else {
    state.chef.moving = false;
  }

  updateChop(state, dt, sfx);
  updateStove(state, dt, sfx);
  const ended = updateOrders(state, dt);
  if (ended === 'shift-over') {
    finishShift(state);
    sfx.gameOver();
    return;
  }
  if (state.time >= DAY_LENGTH) {
    finishShift(state);
    sfx.gameOver();
    return;
  }
  updateParticles(state, dt);
}

function stepGame(dt) {
  if (!state.frozen) update(dt);
  state.nearest = nearestStationOf(state);
  render(ctx, state);
}

function frame(ts) {
  requestAnimationFrame(frame);
  if (!frame.last) frame.last = ts;
  let dt = (ts - frame.last) / 1000;
  frame.last = ts;
  if (dt > 0.1) dt = 0.1;
  if (dt < 0) dt = 0;
  stepGame(dt);
}

// --- input ---------------------------------------------------------------

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) e.preventDefault();
  sfx.ensure();
  if (key === 'm') {
    state.muted = !state.muted;
    sfx.muted = state.muted;
    return;
  }
  if (key === 'enter') {
    if (state.screen === 'title') {
      startShift(state);
      sfx.click();
    } else if (state.screen === 'results') {
      startShift(state);
      sfx.click();
    }
    return;
  }
  if (key === 'r' && state.screen === 'results') {
    startShift(state);
    sfx.click();
    return;
  }
  if (key === 'p' && state.screen === 'play') {
    state.paused = !state.paused;
    return;
  }
  if (key === 'escape' && state.fridgeMenuOpen) {
    state.fridgeMenuOpen = false;
    return;
  }
  if (state.screen !== 'play' || state.paused) return;
  if (key >= '1' && key <= '7') {
    takeFromFridge(state, Number(key) - 1, sfx);
    return;
  }
  if (key === 'e' || key === ' ') {
    if (!e.repeat) interact(state, sfx);
    return;
  }
  if (key === 'q' && !e.repeat) {
    setDown(state, sfx);
    return;
  }
  keys.add(key);
});

window.addEventListener('keyup', (e) => {
  keys.delete(e.key.toLowerCase());
});

canvas.addEventListener('click', (e) => {
  sfx.ensure();
  const p = canvasPoint(e.clientX, e.clientY);
  if (state.screen === 'title') {
    startShift(state);
    sfx.click();
    return;
  }
  if (state.screen !== 'play' || state.paused) return;
  if (state.fridgeMenuOpen) {
    // Fridge menu rows: x 440..840, first row at y 212, 44px each.
    if (p.x >= 440 && p.x <= 840 && p.y >= 212 && p.y < 212 + 7 * 44) {
      takeFromFridge(state, Math.floor((p.y - 212) / 44), sfx);
    } else {
      state.fridgeMenuOpen = false;
    }
    return;
  }
  // Click a station to walk to it and use it; click the floor to walk there.
  let clickedStation = null;
  for (const station of Object.values(STATIONS)) {
    if (p.x >= station.x - 20 && p.x <= station.x + station.w + 20 &&
        p.y >= station.y - 20 && p.y <= station.y + station.h + 20) {
      clickedStation = station;
      break;
    }
  }
  if (clickedStation) {
    const near = nearestStationOf(state);
    if (near && near.kind === clickedStation.kind) {
      interact(state, sfx);
    } else {
      const tx = Math.max(clickedStation.x, Math.min(state.chef.x, clickedStation.x + clickedStation.w));
      const ty = Math.max(clickedStation.y, Math.min(state.chef.y, clickedStation.y + clickedStation.h));
      moveTarget = { x: tx, y: ty + 44 };
    }
  } else {
    moveTarget = { x: p.x, y: p.y };
  }
});

// --- staged screenshots: real renders of the game's own code -------------

function stageCover() {
  startShift(state);
  state.time = 46; // 02:14 left on the shift clock
  state.coins = 320;
  state.combo = 3;
  state.servedCount = 6;
  state.orders = [
    { id: 1, recipeId: 'sunny-noodle-bowl', patience: 50, remaining: 12, state: 'open' },
    { id: 2, recipeId: 'ember-burger', patience: 52, remaining: 34, state: 'open' },
    { id: 3, recipeId: 'garden-salad', patience: 55, remaining: 48, state: 'open' },
  ];
  state.nextOrderId = 4;
  // The chef at the plating counter, mid-dish in hand.
  state.chef.x = 920;
  state.chef.y = 366;
  state.chef.carry = ['tomato-chopped', 'patty-cooked'];
  // One dish mid-assembly on the plating counter: 2 of 3 items placed.
  state.plateSlots[0] = { recipeId: 'sunny-noodle-bowl', placed: ['noodle-cooked', 'lettuce-chopped'], done: false };
  // And a finished burger on the second plate, ready to serve.
  state.plateSlots[1] = { recipeId: 'ember-burger', placed: ['bun', 'patty-cooked', 'tomato-chopped'], done: true };
  // Ingredients waiting on the middle counter.
  state.counterItems = ['tomato', 'lettuce', 'noodle'];
  // A patty sizzling on burner one.
  state.burners[0] = { item: 'patty', progress: 0.6, done: false, over: 0 };
  // The last serve's pay-off, floating on the floor below the window.
  state.floats.push({ x: 1172, y: 350, text: '+$18', color: '#ffd94a', life: 1.4, maxLife: 1.4 });
  state.frozen = true;
}

function stageRush() {
  startShift(state);
  state.time = 133; // 00:47 left
  state.coins = 540;
  state.combo = 5;
  state.hearts = 1;
  state.servedCount = 14;
  state.orders = [
    { id: 1, recipeId: 'ember-burger', patience: 44, remaining: 9, state: 'open' },
    { id: 2, recipeId: 'sizzle-platter', patience: 42, remaining: 14, state: 'open' },
    { id: 3, recipeId: 'crispy-fish-taco', patience: 45, remaining: 21, state: 'open' },
    { id: 4, recipeId: 'sunny-noodle-bowl', patience: 43, remaining: 30, state: 'open' },
  ];
  state.nextOrderId = 5;
  state.burners[0] = { item: 'patty', progress: 0.7, done: false, over: 0 };
  state.burners[1] = { item: 'fish', progress: 0.45, done: false, over: 0 };
  state.plateSlots[0] = { recipeId: 'garden-salad', placed: ['lettuce-chopped', 'tomato-chopped'], done: true };
  state.counterItems = ['tomato', 'lettuce'];
  // Off to the stove's right side, clear of the plating label.
  state.chef.x = 1005;
  state.chef.y = 215;
  state.chef.carry = ['tomato-chopped', 'lettuce-chopped', 'bun'];
  state.rush = true;
  state.frozen = true;
}

function stageServed() {
  startShift(state);
  state.time = 58;
  state.coins = 385;
  state.combo = 2;
  state.servedCount = 8;
  state.orders = [
    { id: 1, recipeId: 'ember-burger', patience: 52, remaining: 52, state: 'served' },
    { id: 2, recipeId: 'garden-salad', patience: 55, remaining: 41, state: 'open' },
    { id: 3, recipeId: 'sunny-noodle-bowl', patience: 50, remaining: 26, state: 'open' },
  ];
  state.nextOrderId = 4;
  // Below the window so the chef stands clear of the pay-off floats.
  state.chef.x = 1172;
  state.chef.y = 430;
  state.chef.carry = [];
  // The pay-off, stacked on the floor below the serving window.
  state.floats.push({ x: 1172, y: 336, text: '+$22', color: '#ffd94a', life: 1.4, maxLife: 1.4 });
  state.floats.push({ x: 1172, y: 364, text: 'TIP $7!', color: '#7be495', life: 1.4, maxLife: 1.4 });
  state.floats.push({ x: 1172, y: 392, text: 'COMBO x2 +$4', color: '#ff9ecf', life: 1.4, maxLife: 1.4 });
  // Celebration sparkles around the chef, clear of the pay-off text.
  for (let i = 0; i < 12; i++) {
    state.particles.push({
      x: 1172 + (Math.random() - 0.5) * 90,
      y: 420 + (Math.random() - 0.5) * 50,
      vx: 0, vy: 0, color: '#ffd94a', life: 0.9, maxLife: 0.9, size: 3,
    });
  }
  state.frozen = true;
}

function stageShot(name) {
  state.shotName = name;
  if (name === 'cover') stageCover();
  else if (name === 'rush') stageRush();
  else if (name === 'served') stageServed();
  else if (name === 'start') state.screen = 'title';
}

// --- self-test: plays a full order end to end through real key events ----

function keyEvent(key) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  window.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
}

function wait(seconds) {
  // Headless virtual time barely advances requestAnimationFrame, so the test
  // steps the game itself in fixed slices — the same update() real play uses.
  return new Promise((resolve) => {
    let left = seconds;
    const tick = () => {
      const slice = Math.min(0.05, left);
      left -= slice;
      stepGame(slice);
      if (left <= 0) resolve();
      else setTimeout(tick, 0);
    };
    tick();
  });
}

async function runSelfTest() {
  const results = [];
  const errors = [];
  window.addEventListener('error', (e) => errors.push(String(e.message || e.error)));
  const check = (name, ok, detail) => results.push({ name, ok: !!ok, detail: detail || '' });
  try {
    startShift(state);
    check('shift starts', state.screen === 'play');
    spawnOrder(state, 'ember-burger');
    check('order spawns', state.orders.length === 1 && state.orders[0].recipeId === 'ember-burger');

    // Approach points picked so the target station is unambiguously nearest:
    // the stove and plating counter sit close together, so the stove is
    // approached from its right side, away from the plating counter.
    const APPROACH = {
      fridge: { x: 380, y: 218 },
      counter: { x: 630, y: 194 },
      stove: { x: 1040, y: 138 },
      plating: { x: 920, y: 346 },
      window: { x: 1172, y: 346 },
      bin: { x: 352, y: 596 },
    };
    const near = (station) => {
      const p = APPROACH[station.kind];
      state.chef.x = p.x;
      state.chef.y = p.y;
    };
    // Fridge: tomato.
    near(STATIONS.fridge);
    keyEvent('e');
    check('fridge menu opens', state.fridgeMenuOpen === true);
    keyEvent('1');
    check('tomato taken', state.chef.carry.includes('tomato'), state.chef.carry.join(','));
    keyEvent('e');
    check('fridge menu closes', state.fridgeMenuOpen === false);
    // Board: chop it.
    near(STATIONS.counter);
    keyEvent('e');
    check('chopping starts', state.chop !== null);
    await wait(1.0);
    check('tomato chopped', state.chef.carry.includes('tomato-chopped'), state.chef.carry.join(','));
    // Fridge: patty, then stove.
    near(STATIONS.fridge);
    keyEvent('e'); keyEvent('4'); keyEvent('e');
    check('patty taken', state.chef.carry.includes('patty'), state.chef.carry.join(','));
    near(STATIONS.stove);
    keyEvent('e');
    check('patty on burner', state.burners[0].item === 'patty');
    await wait(7.0);
    check('patty cooked', state.burners[0].done === true);
    keyEvent('e');
    check('cooked patty taken', state.chef.carry.includes('patty-cooked'), state.chef.carry.join(','));
    // Fridge: bun, then plate the burger.
    near(STATIONS.fridge);
    keyEvent('e'); keyEvent('6'); keyEvent('e');
    check('bun taken', state.chef.carry.includes('bun'), state.chef.carry.join(','));
    near(STATIONS.plating);
    keyEvent('e');
    check('burger plated', state.plateSlots.some((s) => s && s.recipeId === 'ember-burger'));
    keyEvent('e');
    check('dish picked up', state.chef.carry.includes('dish:ember-burger'), state.chef.carry.join(','));
    // Window: serve it.
    const coinsBefore = state.coins;
    near(STATIONS.window);
    keyEvent('e');
    check('order served', state.orders[0].state === 'served');
    check('coins paid', state.coins > coinsBefore, `${coinsBefore} -> ${state.coins}`);
    // Timer runs: let the clock tick and confirm the shift clock advances.
    const t0 = state.time;
    await wait(2.0);
    check('clock ticks', state.time > t0 + 1, `${t0.toFixed(1)} -> ${state.time.toFixed(1)}`);
    // No network: every loaded resource is same-origin.
    const external = performance.getEntriesByType('resource')
      .filter((r) => !r.name.startsWith(window.location.origin));
    check('no external requests', external.length === 0, external.map((r) => r.name).join(','));
    check('no console errors', errors.length === 0, errors.join('; '));
  } catch (err) {
    results.push({ name: 'self-test crashed', ok: false, detail: String(err && err.message || err) });
  }
  const failed = results.filter((r) => !r.ok);
  const summary = failed.length === 0 ? 'SELFTEST PASS' : `SELFTEST FAIL (${failed.length})`;
  const pre = document.createElement('pre');
  pre.id = 'selftest-result';
  pre.textContent = JSON.stringify({ summary, results, errors }, null, 2);
  document.body.appendChild(pre);
  document.title = summary;
  document.body.dataset.selftest = failed.length === 0 ? 'pass' : 'fail';
}

// --- boot ------------------------------------------------------------------

const params = new URLSearchParams(window.location.search);
if (params.get('shot')) stageShot(params.get('shot'));
// Paint one frame at once, so a screenshot never catches an empty canvas
// while the first animation frame is still on its way.
stepGame(0);
requestAnimationFrame(frame);
if (params.get('selftest') === '1') {
  // Let the first frame paint, then play through the game for real.
  setTimeout(runSelfTest, 300);
}

// Test/debug hooks (used by the self-test above; harmless in play).
window.__sizzle = {
  state,
  startShift: () => startShift(state),
  teleport: (x, y) => { state.chef.x = x; state.chef.y = y; },
  spawnOrder: (id) => spawnOrder(state, id),
  recipeName: (id) => (RECIPES_BY_ID[id] || {}).name,
};

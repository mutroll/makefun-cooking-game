// orders.js — the order board: what the customers want, how long they wait,
// and what a served dish is worth. One clear job: orders and scoring.

import { RECIPES, RECIPES_BY_ID } from './recipes.js';
import { MAX_ORDERS, MAX_HEARTS } from './state.js';
import { addFloat, burst, say } from './kitchen.js';

// Early orders lean easy (salad, noodles); the platter only shows up once the
// kitchen is warm, so the ramp is recipes as well as speed.
function pickRecipe(elapsed) {
  const pool = [];
  for (const recipe of RECIPES) {
    let weight = 3;
    if (recipe.id === 'sizzle-platter') weight = elapsed > 70 ? 3 : 0;
    if (recipe.id === 'crispy-fish-taco') weight = elapsed > 35 ? 3 : 1;
    if (recipe.id === 'ember-burger') weight = elapsed > 20 ? 3 : 2;
    for (let i = 0; i < weight; i++) pool.push(recipe.id);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

export function spawnOrder(state, recipeId) {
  if (state.orders.filter((o) => o.state === 'open').length >= MAX_ORDERS) return null;
  const id = recipeId || pickRecipe(state.time);
  const recipe = RECIPES_BY_ID[id];
  // Patience tightens as the shift wears on: 55s at the start, 40s at the end.
  const patience = Math.max(40, 55 - state.time * 0.08);
  const order = { id: state.nextOrderId++, recipeId: id, patience, remaining: patience, state: 'open' };
  state.orders.push(order);
  return order;
}

export function spawnInterval(state) {
  // New ticket every ~18s at first, every ~9s by the end of the shift.
  return Math.max(9, 18 - state.time * 0.05);
}

export function updateOrders(state, dt) {
  state.spawnIn -= dt;
  if (state.spawnIn <= 0) {
    if (spawnOrder(state)) state.spawnIn = spawnInterval(state);
    else state.spawnIn = 3; // board full: check again shortly
  }
  const openCount = state.orders.filter((o) => o.state === 'open').length;
  state.rush = openCount >= 3;
  for (const order of state.orders) {
    if (order.state !== 'open') continue;
    order.remaining -= dt;
    if (order.remaining <= 0) {
      order.state = 'expired';
      order.remaining = 0;
      state.missedCount += 1;
      state.combo = 0;
      state.hearts = Math.max(0, state.hearts - 1);
      say(state, `Too slow — a ${RECIPES_BY_ID[order.recipeId].name} walked out!`);
      if (state.hearts <= 0) return 'shift-over';
    }
  }
  return null;
}

// Serve a finished dish. Returns 'served' | 'no-order' | 'not-a-dish'.
export function serveDish(state, dishItem, sfx) {
  if (!dishItem || !dishItem.startsWith('dish:')) return 'not-a-dish';
  const recipeId = dishItem.slice(5);
  const recipe = RECIPES_BY_ID[recipeId];
  const order = state.orders.find((o) => o.state === 'open' && o.recipeId === recipeId);
  if (!order) {
    say(state, `No order for ${recipe.name} right now!`);
    if (sfx) sfx.error();
    return 'no-order';
  }
  order.state = 'served';
  const tip = Math.round((order.remaining / order.patience) * 8);
  const comboBonus = state.combo >= 2 ? state.combo * 2 : 0;
  const earned = recipe.price + tip + comboBonus;
  state.coins += earned;
  state.score += earned;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.servedCount += 1;
  const wx = 1172;
  const wy = 200;
  addFloat(state, wx, wy - 20, `+$${earned}`, '#ffd94a');
  if (tip >= 5) addFloat(state, wx, wy - 48, `TIP $${tip}!`, '#7be495');
  if (comboBonus > 0) addFloat(state, wx, wy - 76, `COMBO x${state.combo} +$${comboBonus}`, '#ff9ecf');
  burst(state, wx, wy, '#ffd94a', 16);
  if (sfx) sfx.serve();
  return 'served';
}

export function finishShift(state) {
  state.screen = 'results';
  state.results = {
    coins: state.coins,
    served: state.servedCount,
    missed: state.missedCount,
    bestCombo: state.bestCombo,
    heartsLeft: state.hearts,
  };
  state.orders = state.orders.filter((o) => o.state === 'open');
}

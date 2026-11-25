// interact.js — what happens when the chef presses E (or Q) at a station.
// One clear job: turning a station visit into a kitchen action.

import { INGREDIENTS, INGREDIENT_BY_ID, choppedId, cookedId, itemIsDish, recipeMatching, recipePartial } from './recipes.js';
import { CHOP_SECONDS, MAX_CARRY, BURN_GRACE_SECONDS } from './state.js';
import { STATIONS, addFloat, burst, say } from './kitchen.js';
import { serveDish } from './orders.js';

function stationCenter(station) {
  return { x: station.x + station.w / 2, y: station.y + station.h / 2 };
}

function firstChoppable(carry) {
  return carry.find((item) => {
    const base = INGREDIENT_BY_ID[item];
    return base && base.chop;
  });
}

function firstCookable(carry) {
  return carry.find((item) => {
    const base = INGREDIENT_BY_ID[item];
    return base && base.cook;
  });
}

// The E key: one press, one clear action, answered at once.
export function interact(state, sfx) {
  const chef = state.chef;
  const station = nearestStationOf(state);
  if (!station) return;
  const center = stationCenter(station);

  if (station.kind === 'fridge') {
    state.fridgeMenuOpen = !state.fridgeMenuOpen;
    if (sfx) sfx.pop();
    return;
  }

  if (station.kind === 'counter') {
    // Chopping answers at once: the knife starts the moment E is pressed.
    const choppable = firstChoppable(chef.carry);
    if (choppable && !state.chop) {
      state.chop = { itemId: choppable, progress: 0, total: CHOP_SECONDS };
      if (sfx) sfx.chopStart();
      burst(state, center.x, center.y - 6, '#ffffff', 6);
      return;
    }
    if (state.counterItems.length > 0 && chef.carry.length < MAX_CARRY) {
      const taken = state.counterItems.pop();
      chef.carry.push(taken);
      if (sfx) sfx.pop();
      return;
    }
    say(state, 'Nothing to chop — grab something from the fridge first.');
    return;
  }

  if (station.kind === 'stove') {
    const doneBurner = state.burners.find((b) => b.item && b.done);
    if (doneBurner && chef.carry.length < MAX_CARRY) {
      chef.carry.push(cookedId(doneBurner.item));
      burst(state, center.x, center.y, '#ffb347', 8);
      if (sfx) sfx.pop();
      doneBurner.item = null;
      doneBurner.progress = 0;
      doneBurner.done = false;
      doneBurner.over = 0;
      return;
    }
    const cookable = firstCookable(chef.carry);
    const freeBurner = state.burners.find((b) => !b.item);
    if (cookable && freeBurner) {
      freeBurner.item = cookable;
      freeBurner.progress = 0;
      freeBurner.done = false;
      freeBurner.over = 0;
      chef.carry.splice(chef.carry.indexOf(cookable), 1);
      if (sfx) sfx.sizzle();
      return;
    }
    if (!freeBurner && !doneBurner) say(state, 'Both burners are busy!');
    else if (!cookable) say(state, 'Nothing cookable in your hands.');
    return;
  }

  if (station.kind === 'plating') {
    const recipe = recipeMatching(chef.carry);
    const freeSlot = state.plateSlots.findIndex((slot) => slot === null);
    if (recipe && freeSlot !== -1) {
      state.plateSlots[freeSlot] = { recipeId: recipe.id, placed: [...recipe.needs], done: true };
      chef.carry = [];
      burst(state, center.x, center.y, recipe.color, 14);
      addFloat(state, center.x, center.y - 30, `${recipe.name} plated!`, '#ffffff');
      if (sfx) sfx.plate();
      return;
    }
    const waiting = state.plateSlots.findIndex((slot) => slot && slot.done);
    if (waiting !== -1 && chef.carry.length < MAX_CARRY) {
      const slot = state.plateSlots[waiting];
      chef.carry.push(`dish:${slot.recipeId}`);
      state.plateSlots[waiting] = null;
      if (sfx) sfx.pop();
      return;
    }
    if (recipe && freeSlot === -1) {
      say(state, 'No free plate — serve one first!');
      return;
    }
    const partial = recipePartial(chef.carry);
    if (partial) {
      say(state, `${partial.recipe.name} still needs: ${partial.missing.map((m) => m.replace(/-(chopped|cooked)/, '')).join(', ')}`);
    } else {
      say(state, 'Those ingredients make no dish on the menu.');
    }
    return;
  }

  if (station.kind === 'window') {
    const dishIndex = chef.carry.findIndex((item) => itemIsDish(item));
    if (dishIndex === -1) {
      say(state, 'Carry a plated dish to the window to serve it.');
      return;
    }
    const dish = chef.carry[dishIndex];
    const result = serveDish(state, dish, sfx);
    if (result === 'served') chef.carry.splice(dishIndex, 1);
    return;
  }

  if (station.kind === 'bin') {
    if (chef.carry.length === 0) {
      say(state, 'Your hands are already empty.');
      return;
    }
    const tossed = chef.carry.pop();
    burst(state, center.x, center.y, '#9aa0a6', 6);
    if (sfx) sfx.trash();
    say(state, `Tossed the ${tossed.replace(/^(dish:)/, '')}.`);
  }
}

// Q near the counter: set an ingredient down so both hands stay free for a route.
export function setDown(state, sfx) {
  const station = nearestStationOf(state);
  if (!station || station.kind !== 'counter') return;
  if (state.chef.carry.length === 0) return;
  if (state.counterItems.length >= 4) {
    say(state, 'The counter is full.');
    return;
  }
  const item = state.chef.carry.pop();
  state.counterItems.push(item);
  if (sfx) sfx.pop();
}

export function nearestStationOf(state) {
  let best = null;
  let bestDistance = Infinity;
  for (const station of Object.values(STATIONS)) {
    const px = Math.max(station.x, Math.min(state.chef.x, station.x + station.w));
    const py = Math.max(station.y, Math.min(state.chef.y, station.y + station.h));
    const d = Math.hypot(state.chef.x - px, state.chef.y - py);
    if (d < bestDistance) {
      bestDistance = d;
      best = station;
    }
  }
  return bestDistance <= 56 ? best : null;
}

// Pick an ingredient out of the open fridge menu (keys 1..7, or a click).
export function takeFromFridge(state, index, sfx) {
  if (!state.fridgeMenuOpen) return false;
  const ingredient = INGREDIENTS[index];
  if (!ingredient) return false;
  if (state.chef.carry.length >= MAX_CARRY) {
    say(state, 'Your hands are full — plate or set something down first.');
    if (sfx) sfx.error();
    return false;
  }
  state.chef.carry.push(ingredient.id);
  if (sfx) sfx.pop();
  return true;
}

// Chopping ticks while the chef stays at the board; walking away cancels it.
export function updateChop(state, dt, sfx) {
  if (!state.chop) return;
  const station = STATIONS.counter;
  const px = Math.max(station.x, Math.min(state.chef.x, station.x + station.w));
  const py = Math.max(station.y, Math.min(state.chef.y, station.y + station.h));
  const stillThere = Math.hypot(state.chef.x - px, state.chef.y - py) <= 70;
  if (!stillThere) {
    state.chop = null;
    return;
  }
  state.chop.progress += dt;
  if (Math.floor(state.chop.progress * 10) !== Math.floor((state.chop.progress - dt) * 10)) {
    burst(state, station.x + station.w / 2, station.y + 20, '#ffffff', 2);
  }
  if (state.chop.progress >= state.chop.total) {
    const raw = state.chop.itemId;
    const index = state.chef.carry.indexOf(raw);
    if (index !== -1) state.chef.carry[index] = choppedId(raw);
    addFloat(state, station.x + station.w / 2, station.y - 8, 'Chopped!', '#7be495');
    if (sfx) sfx.chopDone();
    state.chop = null;
  }
}

// Burners cook in real time; a finished dish burns if it sits too long.
export function updateStove(state, dt, sfx) {
  for (const burner of state.burners) {
    if (!burner.item) continue;
    const ingredient = INGREDIENT_BY_ID[burner.item];
    if (!ingredient) continue;
    if (!burner.done) {
      burner.progress += dt / ingredient.cookTime;
      if (burner.progress >= 1) {
        burner.progress = 1;
        burner.done = true;
        burner.over = 0;
        addFloat(state, 920, 84, 'Ready!', '#ffd94a');
        if (sfx) sfx.ding();
      }
    } else {
      burner.over += dt;
      if (burner.over >= BURN_GRACE_SECONDS) {
        burner.item = null;
        burner.progress = 0;
        burner.done = false;
        burner.over = 0;
        addFloat(state, 920, 84, 'Burnt!', '#ff6b5e');
        say(state, 'Left it too long — it burnt!');
        if (sfx) sfx.error();
      }
    }
  }
}

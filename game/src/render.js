// render.js — everything the player sees, drawn fresh each frame on one canvas.
// One clear job: drawing. No game rules here, only shapes, colours and text.

import { INGREDIENTS, RECIPES_BY_ID, itemLabel, itemBaseColor, itemIsDish } from './recipes.js';
import { STATIONS, FLOOR } from './kitchen.js';
import { DAY_LENGTH, MAX_HEARTS, starsFor } from './state.js';

export const VIEW_W = 1280;
export const VIEW_H = 720;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, weight, align) {
  ctx.fillStyle = color;
  ctx.font = `${weight || 'bold'} ${size}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function fmtTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// --- food icons: every dish drawn from shapes, no images ----------------

export function drawIngredientIcon(ctx, itemId, x, y, r) {
  const isChopped = itemId.endsWith('-chopped');
  const isCooked = itemId.endsWith('-cooked');
  const plain = itemId.replace(/-(chopped|cooked)$/, '');
  ctx.save();
  ctx.translate(x, y);
  if (plain === 'tomato') {
    ctx.fillStyle = '#e8442e';
    ctx.beginPath(); ctx.arc(0, 1, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3f9e4d';
    ctx.beginPath();
    ctx.moveTo(0, -r); ctx.lineTo(-r * 0.45, -r * 0.25); ctx.lineTo(r * 0.45, -r * 0.25);
    ctx.closePath(); ctx.fill();
  } else if (plain === 'lettuce') {
    ctx.fillStyle = '#58b368';
    for (const [ox, oy, orr] of [[-r * 0.4, 0, r * 0.62], [r * 0.4, 0, r * 0.62], [0, -r * 0.35, r * 0.6]]) {
      ctx.beginPath(); ctx.arc(ox, oy, orr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#2f7d3d'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-r * 0.5, r * 0.2); ctx.quadraticCurveTo(0, -r * 0.4, r * 0.5, r * 0.2); ctx.stroke();
  } else if (plain === 'noodle') {
    ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = r * 0.32; ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, i * r * 0.5);
      ctx.quadraticCurveTo(-r * 0.3, i * r * 0.5 - r * 0.45, r * 0.3, i * r * 0.5);
      ctx.quadraticCurveTo(r * 0.9, i * r * 0.5 + r * 0.45, r * 0.95, i * r * 0.5);
      ctx.stroke();
    }
  } else if (plain === 'patty') {
    ctx.fillStyle = '#8a5a2b';
    rr(ctx, -r, -r * 0.62, r * 2, r * 1.24, r * 0.5); ctx.fill();
    ctx.fillStyle = '#5d3a17';
    for (const [ox, oy] of [[-r * 0.5, -r * 0.2], [r * 0.3, r * 0.25], [r * 0.55, -r * 0.3], [-r * 0.1, r * 0.35]]) {
      ctx.beginPath(); ctx.arc(ox, oy, r * 0.12, 0, Math.PI * 2); ctx.fill();
    }
  } else if (plain === 'fish') {
    ctx.fillStyle = '#5aa9e6';
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-r * 0.8, 0); ctx.lineTo(-r * 1.35, -r * 0.55); ctx.lineTo(-r * 1.35, r * 0.55); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1d3557';
    ctx.beginPath(); ctx.arc(r * 0.45, -r * 0.1, r * 0.13, 0, Math.PI * 2); ctx.fill();
  } else if (plain === 'bun') {
    ctx.fillStyle = '#e8b06a';
    ctx.beginPath(); ctx.arc(0, r * 0.35, r, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillRect(-r, r * 0.35, r * 2, r * 0.28);
    ctx.fillStyle = '#fff3d6';
    for (const [ox, oy] of [[-r * 0.45, -r * 0.25], [r * 0.1, -r * 0.55], [r * 0.5, -r * 0.15]]) {
      ctx.beginPath(); ctx.ellipse(ox, oy, r * 0.14, r * 0.08, 0.4, 0, Math.PI * 2); ctx.fill();
    }
  } else if (plain === 'shell') {
    ctx.fillStyle = '#f0d089';
    ctx.beginPath(); ctx.arc(0, r * 0.3, r, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, r * 0.3, r * 0.62, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  }
  if (isChopped) {
    // Two parallel slice marks: the ingredient has been cut, not crossed out.
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-r * 0.75, -r * 0.35); ctx.lineTo(-r * 0.05, r * 0.55); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * 0.05, -r * 0.55); ctx.lineTo(r * 0.75, r * 0.35); ctx.stroke();
  }
  if (isCooked) {
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const ox of [-r * 0.4, r * 0.3]) {
      ctx.beginPath(); ctx.moveTo(ox, -r * 1.1);
      ctx.quadraticCurveTo(ox + 4, -r * 1.5, ox, -r * 1.85); ctx.stroke();
    }
  }
  ctx.restore();
}

function drawDishIcon(ctx, recipeId, x, y, r) {
  const recipe = RECIPES_BY_ID[recipeId];
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#f8f4ec';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d8cfc0'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2); ctx.stroke();
  if (recipe) {
    ctx.fillStyle = recipe.color;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(-r * 0.18, -r * 0.2, r * 0.16, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawItemChip(ctx, itemId, x, y, r) {
  if (itemIsDish(itemId)) drawDishIcon(ctx, itemId.slice(5), x, y, r);
  else drawIngredientIcon(ctx, itemId, x, y, r);
}

// --- the room -------------------------------------------------------------

function drawFloor(ctx) {
  ctx.fillStyle = '#2b2118';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Warm checkerboard tiles.
  for (let ty = 0; ty < 11; ty++) {
    for (let tx = 0; tx < 16; tx++) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? '#c9a06a' : '#bd9260';
      ctx.fillRect(FLOOR.x + tx * 60, FLOOR.y + ty * 60, 60, 60);
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  for (let ty = 0; ty < 11; ty++) ctx.fillRect(FLOOR.x, FLOOR.y + ty * 60, FLOOR.w, 2);
  // Wall band along the top of the kitchen.
  ctx.fillStyle = '#7a4a2b';
  ctx.fillRect(FLOOR.x, FLOOR.y, FLOOR.w, 10);
  // Order board backdrop (left column).
  ctx.fillStyle = '#3a2a1c';
  ctx.fillRect(0, 0, 296, VIEW_H);
}

function drawStation(ctx, station, state) {
  const { x, y, w, h } = station;
  const near = state.nearest && state.nearest.kind === station.kind;
  ctx.save();
  if (station.kind === 'fridge') {
    ctx.fillStyle = '#dfe9ee'; rr(ctx, x, y, w, h, 10); ctx.fill();
    ctx.fillStyle = '#b9cdd6'; rr(ctx, x + 6, y + 6, w - 12, h * 0.42, 6); ctx.fill();
    ctx.fillStyle = '#9fb8c4'; rr(ctx, x + 6, y + h * 0.52, w - 12, h * 0.4, 6); ctx.fill();
    ctx.fillStyle = '#5b7a88'; ctx.fillRect(x + w - 18, y + 14, 6, 26); ctx.fillRect(x + w - 18, y + h * 0.55, 6, 26);
    drawIngredientIcon(ctx, 'tomato', x + 30, y + h * 0.28, 11);
    drawIngredientIcon(ctx, 'lettuce', x + 62, y + h * 0.28, 11);
    drawIngredientIcon(ctx, 'fish', x + 92, y + h * 0.72, 11);
  } else if (station.kind === 'counter') {
    ctx.fillStyle = '#8a5a2b'; rr(ctx, x, y, w, h, 8); ctx.fill();
    ctx.fillStyle = '#a9743f'; rr(ctx, x + 4, y + 4, w - 8, h - 8, 6); ctx.fill();
    // The chopping board itself.
    ctx.fillStyle = '#f0dcae'; rr(ctx, x + w / 2 - 52, y + 12, 104, h - 24, 6); ctx.fill();
    ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 2; rr(ctx, x + w / 2 - 52, y + 12, 104, h - 24, 6); ctx.stroke();
    state.counterItems.forEach((item, i) => {
      drawItemChip(ctx, item, x + 34 + i * 46, y + h / 2, 15);
    });
    if (state.chop) {
      const p = state.chop.progress / state.chop.total;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x + w / 2 - 52, y + h - 12, 104, 6);
      ctx.fillStyle = '#ffd94a';
      ctx.fillRect(x + w / 2 - 52, y + h - 12, 104 * p, 6);
      text(ctx, 'CHOP!', x + w / 2, y - 12, 15, '#ffd94a', 'bold', 'center');
    }
  } else if (station.kind === 'stove') {
    ctx.fillStyle = '#3c3f45'; rr(ctx, x, y, w, h, 8); ctx.fill();
    ctx.fillStyle = '#565b63'; rr(ctx, x + 4, y + 4, w - 8, h - 8, 6); ctx.fill();
    state.burners.forEach((burner, i) => {
      const bx = x + 52 + i * 96;
      const by = y + h / 2 + 4;
      ctx.fillStyle = '#22242a';
      ctx.beginPath(); ctx.arc(bx, by, 30, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#7d838d'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(bx, by, 24, 0, Math.PI * 2); ctx.stroke();
      if (burner.item) {
        const ing = burner.item;
        if (burner.done) {
          ctx.fillStyle = '#ff9d2e';
          ctx.beginPath(); ctx.arc(bx, by, 33, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,157,46,0.35)';
          ctx.beginPath(); ctx.arc(bx, by, 38, 0, Math.PI * 2); ctx.fill();
        }
        drawIngredientIcon(ctx, ing, bx, by, 16);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(bx - 24, by + 30, 48, 5);
        ctx.fillStyle = burner.done ? '#ff6b5e' : '#7be495';
        const frac = burner.done ? 1 - burner.over / 6 : burner.progress;
        ctx.fillRect(bx - 24, by + 30, 48 * Math.max(0, frac), 5);
      }
    });
  } else if (station.kind === 'plating') {
    ctx.fillStyle = '#e8e2d4'; rr(ctx, x, y, w, h, 8); ctx.fill();
    ctx.fillStyle = '#f8f4ec'; rr(ctx, x + 4, y + 4, w - 8, h - 8, 6); ctx.fill();
    state.plateSlots.forEach((slot, i) => {
      const px = x + 52 + i * 96;
      const py = y + h / 2;
      if (!slot) {
        ctx.strokeStyle = '#c9bfa8'; ctx.setLineDash([5, 4]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px, py, 24, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        return;
      }
      if (slot.done) {
        drawDishIcon(ctx, slot.recipeId, px, py, 24);
      } else {
        // A dish mid-assembly: what is on the plate, and what is still missing.
        ctx.fillStyle = '#f8f4ec';
        ctx.beginPath(); ctx.arc(px, py, 24, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#c9bfa8'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px, py, 24, 0, Math.PI * 2); ctx.stroke();
        slot.placed.forEach((item, j) => {
          drawItemChip(ctx, item, px - 14 + j * 14, py, 8);
        });
        const recipe = RECIPES_BY_ID[slot.recipeId];
        text(ctx, `${slot.placed.length}/${recipe.needs.length}`, px, py + 34, 12, '#5b4632', 'bold', 'center');
      }
    });
  } else if (station.kind === 'window') {
    ctx.fillStyle = '#6b4226'; rr(ctx, x, y, w, h, 10); ctx.fill();
    ctx.fillStyle = '#2b2118'; rr(ctx, x + 8, y + 8, w - 16, 92, 6); ctx.fill();
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath(); ctx.arc(x + w / 2, y + 54, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2b2118';
    ctx.fillRect(x + w / 2 - 2, y + 34, 4, 12);
    text(ctx, 'PICK UP', x + w / 2, y + 128, 15, '#ffe9b0', 'bold', 'center');
    text(ctx, 'ORDERS HERE', x + w / 2, y + 148, 15, '#ffe9b0', 'bold', 'center');
    const dish = state.chef.carry.find((item) => item.startsWith('dish:'));
    if (dish) {
      text(ctx, 'READY TO SERVE', x + w / 2, y + 178, 13, '#7be495', 'bold', 'center');
      drawDishIcon(ctx, dish.slice(5), x + w / 2, y + 200, 15);
    } else {
      text(ctx, 'serve a plated dish', x + w / 2, y + 178, 12, '#c9a06a', 'bold', 'center');
    }
  } else if (station.kind === 'bin') {
    ctx.fillStyle = '#4a4f55'; rr(ctx, x, y, w, h, 8); ctx.fill();
    ctx.fillStyle = '#33373c'; rr(ctx, x + 6, y + 6, w - 12, h - 16, 6); ctx.fill();
    text(ctx, 'BIN', x + w / 2, y + h / 2 + 2, 14, '#cfd4d8', 'bold', 'center');
  }
  // Name tag + glow when the chef is close enough to use it.
  if (near) {
    ctx.strokeStyle = '#ffd94a'; ctx.lineWidth = 3;
    rr(ctx, x - 4, y - 4, w + 8, h + 8, 12); ctx.stroke();
  }
  text(ctx, station.label, x + w / 2, y - 12, 13, near ? '#ffd94a' : '#e8dcc8', 'bold', 'center');
  ctx.restore();
}

function drawChef(ctx, state) {
  const chef = state.chef;
  const bob = chef.moving ? Math.sin(chef.walkPhase) * 2 : 0;
  ctx.save();
  ctx.translate(chef.x, chef.y + bob);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(0, 20 - bob, 20, 7, 0, 0, Math.PI * 2); ctx.fill();
  // Body (apron).
  ctx.fillStyle = '#f4f1ea';
  ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e4572e';
  ctx.beginPath(); ctx.arc(0, 4, 13, 0, Math.PI); ctx.fill();
  ctx.fillRect(-13, 4, 26, 10);
  // Face.
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath(); ctx.arc(chef.dir * 4, -8, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1d3557';
  ctx.beginPath(); ctx.arc(chef.dir * 7, -9, 1.6, 0, Math.PI * 2); ctx.fill();
  // Chef hat.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(-6, -16, 7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -19, 8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(6, -16, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-11, -17, 22, 6);
  // Knife flash while chopping.
  if (state.chop) {
    ctx.strokeStyle = '#dfe9ee'; ctx.lineWidth = 3;
    const swing = Math.sin(state.chop.progress * 28) * 10;
    ctx.beginPath(); ctx.moveTo(14, -4 + swing); ctx.lineTo(26, -14 + swing); ctx.stroke();
  }
  ctx.restore();
}

// --- order board + HUD ----------------------------------------------------

function drawOrderBoard(ctx, state) {
  const x = 16;
  const y = 72;
  const w = 272;
  ctx.fillStyle = '#241a10';
  rr(ctx, x, y, w, 352, 12); ctx.fill();
  ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 2;
  rr(ctx, x, y, w, 352, 12); ctx.stroke();
  text(ctx, 'ORDER BOARD', x + 16, y + 22, 18, '#ffd94a', 'bold');
  const open = state.orders.filter((o) => o.state === 'open');
  const done = state.orders.filter((o) => o.state === 'served').slice(-1);
  const shown = [...open, ...done].slice(0, 4);
  if (shown.length === 0) {
    text(ctx, 'No orders yet —', x + 16, y + 70, 14, '#c9a06a', 'bold');
    text(ctx, 'the lunch rush is coming!', x + 16, y + 92, 14, '#c9a06a', 'bold');
  }
  shown.forEach((order, i) => {
    const recipe = RECIPES_BY_ID[order.recipeId];
    const cy = y + 44 + i * 72;
    const urgent = order.state === 'open' && order.remaining < 12;
    ctx.fillStyle = order.state === 'served' ? '#1f4d2e' : urgent ? '#5e1f1a' : '#3a2a1c';
    rr(ctx, x + 10, cy, w - 20, 64, 8); ctx.fill();
    ctx.strokeStyle = order.state === 'served' ? '#7be495' : urgent ? '#ff6b5e' : '#6b4a2a';
    ctx.lineWidth = 1.5;
    rr(ctx, x + 10, cy, w - 20, 64, 8); ctx.stroke();
    drawDishIcon(ctx, recipe.id, x + 36, cy + 26, 17);
    if (order.state === 'served') {
      text(ctx, '✓ SERVED', x + 74, cy + 26, 15, '#7be495', 'bold');
      text(ctx, recipe.name, x + 74, cy + 46, 12, '#c9e8c9', 'bold');
      return;
    }
    text(ctx, recipe.name, x + 74, cy + 18, 15, '#ffffff', 'bold');
    recipe.needs.forEach((need, j) => {
      drawItemChip(ctx, need, x + 80 + j * 26, cy + 40, 10);
    });
    // Timer bar + seconds.
    const frac = Math.max(0, order.remaining / order.patience);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x + 74, cy + 52, 140, 6);
    ctx.fillStyle = urgent ? '#ff6b5e' : frac > 0.5 ? '#7be495' : '#ffd94a';
    ctx.fillRect(x + 74, cy + 52, 140 * frac, 6);
    text(ctx, `${Math.ceil(order.remaining)}s`, x + 222, cy + 54, 13, urgent ? '#ff8a7a' : '#ffffff', 'bold');
  });
  // Board footer: what the shift has earned so far.
  text(ctx, `Served: ${state.servedCount}   Missed: ${state.missedCount}`, x + 16, y + 338, 13, '#c9a06a', 'bold');
}

function drawTopBar(ctx, state) {
  ctx.fillStyle = '#241a10';
  ctx.fillRect(0, 0, VIEW_W, 56);
  ctx.fillStyle = '#e4572e';
  ctx.fillRect(0, 56, VIEW_W, 4);
  text(ctx, 'SIZZLE LANE', 20, 28, 26, '#ffd94a', 'bold');
  text(ctx, 'a tiny street-food kitchen', 196, 30, 13, '#c9a06a', 'bold');
  // Day timer — the one the player feels.
  const left = Math.max(0, DAY_LENGTH - state.time);
  const urgent = left < 30 && state.screen === 'play';
  text(ctx, 'SHIFT', 640, 16, 12, '#c9a06a', 'bold', 'center');
  text(ctx, fmtTime(left), 640, 38, 24, urgent ? '#ff6b5e' : '#ffffff', 'bold', 'center');
  // Coins and combo.
  text(ctx, `$${state.coins}`, 860, 28, 24, '#ffd94a', 'bold');
  text(ctx, 'COINS', 860, 48, 11, '#c9a06a', 'bold');
  if (state.combo >= 2) {
    text(ctx, `COMBO x${state.combo}`, 1000, 28, 18, '#ff9ecf', 'bold');
  }
  // Hearts.
  for (let i = 0; i < MAX_HEARTS; i++) {
    const hx = 1160 + i * 32;
    ctx.fillStyle = i < state.hearts ? '#ff5d73' : 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(hx, 34);
    ctx.bezierCurveTo(hx - 10, 24, hx - 14, 34, hx, 42);
    ctx.bezierCurveTo(hx + 14, 34, hx + 10, 24, hx, 34);
    ctx.fill();
  }
  text(ctx, 'ORDERS', 1152, 14, 11, '#c9a06a', 'bold', 'center');
  if (state.rush) {
    const pulse = 0.6 + Math.sin(state.time * 6) * 0.4;
    ctx.fillStyle = `rgba(228,68,46,${pulse})`;
    rr(ctx, 520, 8, 90, 40, 8); ctx.fill();
    text(ctx, 'RUSH!', 565, 28, 18, '#ffffff', 'bold', 'center');
  }
}

function drawHandsTray(ctx, state) {
  const carry = state.chef.carry;
  const trayW = 460;
  const x = (VIEW_W - trayW) / 2;
  const y = VIEW_H - 66;
  ctx.fillStyle = 'rgba(36,26,16,0.85)';
  rr(ctx, x, y, trayW, 56, 10); ctx.fill();
  ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 1.5;
  rr(ctx, x, y, trayW, 56, 10); ctx.stroke();
  text(ctx, 'HANDS', x + 14, y + 28, 12, '#c9a06a', 'bold');
  if (carry.length === 0) {
    text(ctx, 'empty — grab ingredients!', x + 76, y + 28, 13, '#8a7a64', 'bold');
  }
  // One column per carried item: icon above, short label below, never touching.
  carry.forEach((item, i) => {
    const cx = x + 104 + i * 112;
    drawItemChip(ctx, item, cx, y + 19, 13);
    text(ctx, itemLabel(item), cx, y + 44, 11, '#ffffff', 'bold', 'center');
  });
}

function drawToast(ctx, state) {
  if (!state.toast || state.time > state.toastUntil) return;
  text(ctx, state.toast, VIEW_W / 2, VIEW_H - 76, 15, '#ffd94a', 'bold', 'center');
}

function drawFloats(ctx, state) {
  for (const f of state.floats) {
    ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
    text(ctx, f.text, f.x, f.y, 20, f.color, 'bold', 'center');
  }
  ctx.globalAlpha = 1;
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// --- overlays --------------------------------------------------------------

function drawTitle(ctx, state) {
  ctx.fillStyle = 'rgba(20,12,6,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'SIZZLE LANE', VIEW_W / 2, 150, 64, '#ffd94a', 'bold', 'center');
  text(ctx, 'One chef. One tiny kitchen. A lunch rush that never waits.', VIEW_W / 2, 196, 18, '#ffe9b0', 'bold', 'center');
  // How to play, as a menu card.
  ctx.fillStyle = '#241a10';
  rr(ctx, 340, 230, 600, 240, 14); ctx.fill();
  ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 2;
  rr(ctx, 340, 230, 600, 240, 14); ctx.stroke();
  const lines = [
    ['1  FRIDGE', 'take ingredients  (E, then 1–7)'],
    ['2  CHOPPING BOARD', 'slice them  (E — answers at once)'],
    ['3  STOVE', 'grill or boil  (E — don\'t let it burn!)'],
    ['4  PLATING', 'combine a recipe  (E)'],
    ['5  SERVING WINDOW', 'serve before the timer runs out  (E)'],
  ];
  lines.forEach(([head, rest], i) => {
    text(ctx, head, 370, 268 + i * 36, 16, '#ffd94a', 'bold');
    text(ctx, rest, 560, 268 + i * 36, 15, '#ffffff', 'bold');
  });
  text(ctx, 'Move: WASD / arrows      Interact: E      Set down: Q      Mute: M', VIEW_W / 2, 500, 15, '#c9a06a', 'bold', 'center');
  const blink = Math.floor(state.time * 2) % 2 === 0;
  if (blink) text(ctx, 'PRESS ENTER TO OPEN THE KITCHEN', VIEW_W / 2, 556, 22, '#ffffff', 'bold', 'center');
  text(ctx, 'Serve fast for tips. Chain serves for combos. Three missed orders ends the shift.', VIEW_W / 2, 600, 14, '#c9a06a', 'bold', 'center');
}

function drawResults(ctx, state) {
  const r = state.results || { coins: 0, served: 0, missed: 0, bestCombo: 0, heartsLeft: 0 };
  ctx.fillStyle = 'rgba(20,12,6,0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'SHIFT OVER', VIEW_W / 2, 150, 52, '#ffd94a', 'bold', 'center');
  const stars = starsFor(r.coins);
  for (let i = 0; i < 3; i++) {
    const sx = VIEW_W / 2 - 70 + i * 70;
    ctx.fillStyle = i < stars ? '#ffd94a' : 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k * Math.PI * 2) / 5;
      const a2 = a + Math.PI / 5;
      const px = sx + Math.cos(a) * 26;
      const py = 205 + Math.sin(a) * 26;
      const qx = sx + Math.cos(a2) * 11;
      const qy = 205 + Math.sin(a2) * 11;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      ctx.lineTo(qx, qy);
    }
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#241a10';
  rr(ctx, 390, 260, 500, 210, 14); ctx.fill();
  ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 2;
  rr(ctx, 390, 260, 500, 210, 14); ctx.stroke();
  const rows = [
    ['Coins earned', `$${r.coins}`],
    ['Dishes served', `${r.served}`],
    ['Orders missed', `${r.missed}`],
    ['Best combo', `x${r.bestCombo}`],
    ['Hearts left', `${r.heartsLeft} / ${MAX_HEARTS}`],
  ];
  rows.forEach(([label, value], i) => {
    text(ctx, label, 420, 292 + i * 34, 16, '#c9a06a', 'bold');
    text(ctx, value, 850, 292 + i * 34, 16, '#ffffff', 'bold', 'right');
  });
  const blink = Math.floor(state.time * 2) % 2 === 0;
  if (blink) text(ctx, 'PRESS R TO COOK ANOTHER SHIFT', VIEW_W / 2, 520, 20, '#ffffff', 'bold', 'center');
}

function drawFridgeMenu(ctx, state) {
  ctx.fillStyle = 'rgba(20,12,6,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const x = 440;
  const y = 150;
  const w = 400;
  const h = 84 + INGREDIENTS.length * 44;
  ctx.fillStyle = '#241a10';
  rr(ctx, x, y, w, h, 14); ctx.fill();
  ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 2;
  rr(ctx, x, y, w, h, 14); ctx.stroke();
  text(ctx, 'FRIDGE — pick an ingredient', x + 22, y + 34, 18, '#ffd94a', 'bold');
  INGREDIENTS.forEach((ing, i) => {
    const iy = y + 62 + i * 44;
    drawIngredientIcon(ctx, ing.id, x + 40, iy, 13);
    text(ctx, `${i + 1}`, x + 66, iy, 15, '#8a7a64', 'bold');
    text(ctx, ing.name, x + 92, iy, 16, '#ffffff', 'bold');
    const tags = [];
    if (ing.chop) tags.push('chop');
    if (ing.cook) tags.push(`cook ${ing.cookTime}s`);
    if (tags.length === 0) tags.push('ready');
    text(ctx, tags.join(' · '), x + w - 22, iy, 13, '#c9a06a', 'bold', 'right');
  });
  text(ctx, 'E or ESC to close', x + w / 2, y + h - 22, 13, '#8a7a64', 'bold', 'center');
}

function drawPause(ctx) {
  ctx.fillStyle = 'rgba(20,12,6,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'PAUSED', VIEW_W / 2, VIEW_H / 2, 48, '#ffffff', 'bold', 'center');
  text(ctx, 'Press P to keep cooking', VIEW_W / 2, VIEW_H / 2 + 48, 16, '#c9a06a', 'bold', 'center');
}

// --- the frame --------------------------------------------------------------

export function render(ctx, state) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(ctx);
  for (const station of Object.values(STATIONS)) drawStation(ctx, station, state);
  drawOrderBoard(ctx, state);
  drawChef(ctx, state);
  drawFloats(ctx, state);
  drawTopBar(ctx, state);
  drawHandsTray(ctx, state);
  drawToast(ctx, state);
  if (state.screen === 'title') drawTitle(ctx, state);
  if (state.screen === 'results') drawResults(ctx, state);
  if (state.fridgeMenuOpen && state.screen === 'play') drawFridgeMenu(ctx, state);
  if (state.paused && state.screen === 'play') drawPause(ctx);
}

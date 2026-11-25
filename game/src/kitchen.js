// kitchen.js — the room itself: stations, walking, and everything the chef does
// with their hands. One clear job: the kitchen floor and its rules.

// Station rectangles on the 1280x720 floor. The order board lives on the left
// (x 16..288); the kitchen floor runs x 304..1264, y 72..704.
export const STATIONS = {
  fridge: { kind: 'fridge', label: 'FRIDGE', x: 320, y: 92, w: 120, h: 96, hint: 'E: open fridge' },
  counter: { kind: 'counter', label: 'CHOPPING BOARD', x: 480, y: 92, w: 300, h: 72, hint: 'E: chop / take · Q: set down' },
  stove: { kind: 'stove', label: 'STOVE', x: 820, y: 92, w: 200, h: 92, hint: 'E: cook / take' },
  plating: { kind: 'plating', label: 'PLATING', x: 820, y: 240, w: 200, h: 76, hint: 'E: plate / pick up' },
  window: { kind: 'window', label: 'SERVING WINDOW', x: 1080, y: 92, w: 184, h: 224, hint: 'E: serve dish' },
  bin: { kind: 'bin', label: 'BIN', x: 320, y: 620, w: 64, h: 64, hint: 'E: throw away' },
};

export const FLOOR = { x: 304, y: 72, w: 960, h: 632 };
export const CHEF_RADIUS = 18;
export const INTERACT_RANGE = 56;

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

function nearestPointOnRect(x, y, rect) {
  return { x: clamp(x, rect.x, rect.x + rect.w), y: clamp(y, rect.y, rect.y + rect.h) };
}

export function distanceToStation(chef, station) {
  const p = nearestPointOnRect(chef.x, chef.y, station);
  return Math.hypot(chef.x - p.x, chef.y - p.y);
}

export function nearestStation(chef) {
  let best = null;
  let bestDistance = Infinity;
  for (const station of Object.values(STATIONS)) {
    const d = distanceToStation(chef, station);
    if (d < bestDistance) {
      bestDistance = d;
      best = station;
    }
  }
  return bestDistance <= INTERACT_RANGE ? best : null;
}

// Walk the chef, sliding along counters instead of sticking on corners.
export function moveChef(state, dx, dy, dt) {
  const chef = state.chef;
  const speed = 265;
  const stepX = dx * speed * dt;
  const stepY = dy * speed * dt;
  chef.x = clamp(chef.x + stepX, FLOOR.x + CHEF_RADIUS, FLOOR.x + FLOOR.w - CHEF_RADIUS);
  chef.y = clamp(chef.y + stepY, FLOOR.y + CHEF_RADIUS, FLOOR.y + FLOOR.h - CHEF_RADIUS);
  for (const station of Object.values(STATIONS)) {
    const p = nearestPointOnRect(chef.x, chef.y, station);
    const dist = Math.hypot(chef.x - p.x, chef.y - p.y);
    if (dist < CHEF_RADIUS && dist > 0.001) {
      const push = (CHEF_RADIUS - dist) / dist;
      chef.x += (chef.x - p.x) * push;
      chef.y += (chef.y - p.y) * push;
    }
  }
  chef.moving = dx !== 0 || dy !== 0;
  if (dx !== 0) chef.dir = dx > 0 ? 1 : -1;
  if (chef.moving) chef.walkPhase += dt * 11;
}

// --- small helpers the interactions share -------------------------------

export function addFloat(state, x, y, text, color) {
  state.floats.push({ x, y, text, color: color || '#ffffff', life: 1.4, maxLife: 1.4 });
}

export function say(state, text) {
  state.toast = text;
  state.toastUntil = state.time + 2.4;
}

export function burst(state, x, y, color, count) {
  for (let i = 0; i < (count || 10); i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 90;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      color,
      life: 0.5 + Math.random() * 0.4,
      maxLife: 0.9,
      size: 2 + Math.random() * 3,
    });
  }
}

export function updateParticles(state, dt) {
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 160 * dt;
    p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const f of state.floats) {
    f.y -= 34 * dt;
    f.life -= dt;
  }
  state.floats = state.floats.filter((f) => f.life > 0);
}

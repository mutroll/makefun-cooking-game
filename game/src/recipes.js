// recipes.js — every ingredient and dish in Sizzle Lane, and how they combine.
// One clear job: the menu. Nothing here touches the canvas, the clock or input.

export const INGREDIENTS = [
  { id: 'tomato', name: 'Tomato', color: '#e8442e', dark: '#b32a1a', chop: true, cook: true, cookTime: 4, price: 2 },
  { id: 'lettuce', name: 'Lettuce', color: '#58b368', dark: '#2f7d3d', chop: true, cook: false, cookTime: 0, price: 2 },
  { id: 'noodle', name: 'Noodles', color: '#f2c14e', dark: '#c78f1d', chop: false, cook: true, cookTime: 4, price: 3 },
  { id: 'patty', name: 'Patty', color: '#8a5a2b', dark: '#5d3a17', chop: false, cook: true, cookTime: 6, price: 4 },
  { id: 'fish', name: 'Fish', color: '#5aa9e6', dark: '#2f6da3', chop: false, cook: true, cookTime: 5, price: 4 },
  { id: 'bun', name: 'Bun', color: '#e8b06a', dark: '#b57e35', chop: false, cook: false, cookTime: 0, price: 2 },
  { id: 'shell', name: 'Taco shell', color: '#f0d089', dark: '#c9a24a', chop: false, cook: false, cookTime: 0, price: 2 },
];

export const INGREDIENT_BY_ID = Object.fromEntries(INGREDIENTS.map((ing) => [ing.id, ing]));

// A carried item is a plain string id. Suffixes mark what the kitchen did to it:
//   'tomato'          raw, straight from the fridge
//   'tomato-chopped'  sliced on the board
//   'patty-cooked'    grilled on the stove (ready to plate)
//   'dish:ember-burger' a finished plate, carried to the window
export function itemLabel(itemId) {
  if (itemId.startsWith('dish:')) {
    const recipe = RECIPES_BY_ID[itemId.slice(5)];
    return recipe ? recipe.name : 'Dish';
  }
  if (itemId.endsWith('-chopped')) return `Chopped ${INGREDIENT_BY_ID[itemId.slice(0, -8)].name}`;
  if (itemId.endsWith('-cooked')) return `Cooked ${INGREDIENT_BY_ID[itemId.slice(0, -7)].name}`;
  const base = INGREDIENT_BY_ID[itemId];
  return base ? base.name : itemId;
}

export function itemBaseColor(itemId) {
  if (itemId.startsWith('dish:')) {
    const recipe = RECIPES_BY_ID[itemId.slice(5)];
    return recipe ? recipe.color : '#f2c14e';
  }
  const plain = itemId.replace(/-(chopped|cooked)$/, '');
  const base = INGREDIENT_BY_ID[plain];
  return base ? base.color : '#cccccc';
}

export function itemIsDish(itemId) {
  return itemId.startsWith('dish:');
}

export function choppedId(rawId) {
  return `${rawId}-chopped`;
}

export function cookedId(rawId) {
  return `${rawId}-cooked`;
}

// A recipe is a set of prepared items. Order inside `needs` never matters:
// the player plates in whatever order the kitchen hands them over.
export const RECIPES = [
  {
    id: 'garden-salad',
    name: 'Garden Salad',
    short: 'Salad',
    color: '#58b368',
    price: 10,
    needs: ['lettuce-chopped', 'tomato-chopped'],
    blurb: 'Crisp, quick, no stove.',
  },
  {
    id: 'sunny-noodle-bowl',
    name: 'Sunny Noodle Bowl',
    short: 'Noodles',
    color: '#f2c14e',
    price: 14,
    needs: ['noodle-cooked', 'tomato-chopped', 'lettuce-chopped'],
    blurb: 'Boil, chop, toss, serve.',
  },
  {
    id: 'ember-burger',
    name: 'Ember Burger',
    short: 'Burger',
    color: '#e08a3c',
    price: 18,
    needs: ['bun', 'patty-cooked', 'tomato-chopped'],
    blurb: 'The house favourite.',
  },
  {
    id: 'crispy-fish-taco',
    name: 'Crispy Fish Taco',
    short: 'Fish Taco',
    color: '#5aa9e6',
    price: 16,
    needs: ['shell', 'fish-cooked', 'tomato-chopped'],
    blurb: 'Grill the fish, mind the shell.',
  },
  {
    id: 'sizzle-platter',
    name: 'Sizzle Platter',
    short: 'Platter',
    color: '#c65d7b',
    price: 22,
    needs: ['patty-cooked', 'fish-cooked', 'lettuce-chopped'],
    blurb: 'Two burners, one big plate.',
  },
];

export const RECIPES_BY_ID = Object.fromEntries(RECIPES.map((recipe) => [recipe.id, recipe]));

// Exact multiset match: the carried items must be precisely one recipe's needs.
export function recipeMatching(carried) {
  if (!carried || carried.length === 0) return null;
  const sorted = [...carried].sort().join('|');
  for (const recipe of RECIPES) {
    if ([...recipe.needs].sort().join('|') === sorted) return recipe;
  }
  return null;
}

// The best recipe the carried items could still become (for the plating hint).
export function recipePartial(carried) {
  if (!carried || carried.length === 0) return null;
  let best = null;
  for (const recipe of RECIPES) {
    const missing = recipe.needs.filter((need) => !carried.includes(need));
    const extra = carried.filter((item) => !recipe.needs.includes(item));
    if (extra.length === 0 && missing.length > 0 && missing.length < recipe.needs.length) {
      if (!best || missing.length < best.missing.length) best = { recipe, missing };
    }
  }
  return best;
}

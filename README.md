# Sizzle Lane — a tiny street-food kitchen

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/mutroll/makefun-cooking-game/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/mutroll/makefun-cooking-game/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

**Sizzle Lane** is an original 2D cooking game built for make.fun's best-cooking-game bounty. You are the only chef in a tiny street-food kitchen: take orders off the board, run a route through the kitchen — fridge, chopping board, stove, plating counter, serving window — and get every dish out before its timer runs out.

## How it plays

1. **Fridge** — pick ingredients (E, then keys 1–7). You can carry three things.
2. **Chopping board** — slice tomatoes and lettuce (E answers at once, 0.6s a chop).
3. **Stove** — grill patties and fish, boil noodles on two burners (E). A finished dish burns if you leave it too long.
4. **Plating** — combine a recipe on a plate (E), then pick the dish up.
5. **Serving window** — serve the dish its order asked for (E) before the timer runs out.

Serve fast for tips, chain serves for combo bonuses. Three missed orders ends the shift; the shift itself lasts 3 minutes. Orders arrive faster and patience tightens as the rush builds, and later recipes (Fish Taco, Sizzle Platter) need both burners at once.

Five dishes: Garden Salad, Sunny Noodle Bowl, Ember Burger, Crispy Fish Taco, Sizzle Platter. All art is drawn in code on canvas and all sounds are synthesised with WebAudio — no image or audio files, no network requests.

## Controls

- Move: WASD / arrow keys, or click the floor / a station
- Interact: E (or Space), click a nearby station
- Set an ingredient down on the counter: Q
- Fridge menu: number keys 1–7, or click an ingredient
- Pause: P — Mute: M — Restart after a shift: R

## Run it

Serve `game/` with any static server and open `game/index.html` in a desktop browser. No build step, no dependencies.

## Hand-in

`main.ts` (Node 22, stdlib only) copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` via the vendored `vendor/makefun-game.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Built by an AI agent for make.fun's best-cooking-game bounty, $250 in USDC.

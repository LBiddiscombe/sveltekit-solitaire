# sveltekit-solitaire

A Klondike Solitaire card game built with [SvelteKit 5](https://svelte.dev/docs/kit) (runes mode), TypeScript, and Tailwind CSS. Features animated card dealing, drag-and-drop, auto-move, undo/redo, and a one-click solve mode.

![Screenshot](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)

## Features

- **Standard Klondike rules** — draw 3 from stock, build tableau descending with alternating colors, foundations ascending by suit
- **Deal animation** — cards fly from the stock to the tableau with a flip effect for face-up cards
- **Drag-and-drop** — click and drag cards between tableau columns, waste, and foundations; invalid drops animate back
- **Auto-move** — click a card to auto-send it to a valid foundation or tableau position
- **Solve mode** — automatically completes the game by finding valid foundation moves
- **Undo / Redo** — up to 100 moves of history
- **Reproducible seeds** — pass a seed for deterministic shuffles (useful for debugging)
- **Animated card flips** — CSS 3D transforms for face-up/face-down transitions
- **Responsive layout** — card sizing adapts to window width

## Play

```sh
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Click **New** to start a fresh game.

## How to play Klondike

| Area                       | Description                                                                |
| -------------------------- | -------------------------------------------------------------------------- |
| **Stock** (top-right)      | Face-down pile; click to draw 3 cards to the Waste                         |
| **Waste** (top-right)      | Face-up pile; top card is playable                                         |
| **Tableau** (7 columns)    | Build descending (K→A), alternating colors. Only Kings go in empty columns |
| **Foundations** (top-left) | Build ascending (A→K) by suit to win                                       |

## Project structure

```
src/
├── lib/
│   ├── actions/
│   │   └── dragdrop.ts          # Pointer-based drag-and-drop controller
│   ├── animations/
│   │   └── host.svelte.ts       # Animation orchestrator (deal, solve, flyback)
│   ├── assets/
│   │   └── cards/               # SVG card images (52 faces + 2 backs)
│   ├── components/
│   │   ├── Board.svelte         # Main game layout & controls
│   │   ├── Pile.svelte          # Generic card pile (tableau / foundation)
│   │   ├── Stock.svelte         # Click-to-draw stock pile
│   │   └── Waste.svelte         # Face-up drawn cards
│   ├── config/
│   │   └── animation.ts         # Timing / easing constants
│   ├── game/
│   │   ├── card.ts              # Suit color & rank helpers
│   │   ├── card-images.ts       # Vite glob → URL mapping
│   │   ├── deal.ts              # Deck creation, shuffle, deal logic
│   │   ├── rules.ts             # Movement validation rules
│   │   └── types.ts             # Card, Suit, Rank, PileKind types
│   └── state/
│       └── game.svelte.ts       # Reactive game state (runes-based store)
├── routes/
│   ├── +layout.svelte           # Root layout
│   ├── +page.svelte             # Home page (renders <Board />)
│   └── layout.css               # Tailwind CSS entrypoint
└── app.html                     # SvelteKit app shell
```

## Scripts

| Command             | Description                 |
| ------------------- | --------------------------- |
| `npm run dev`       | Start Vite dev server       |
| `npm run build`     | Production build            |
| `npm run preview`   | Preview production build    |
| `npm run check`     | Type-check (`svelte-check`) |
| `npm run lint`      | Prettier + ESLint           |
| `npm run format`    | Prettier auto-format        |
| `npm run test:unit` | Vitest (unit + component)   |
| `npm run test:e2e`  | Playwright E2E tests        |
| `npm test`          | Unit (single run) + E2E     |

## Tech stack

- **SvelteKit 5** — runes (`$state`, `$derived`, `$effect`), no stores
- **TypeScript** — strict mode
- **Tailwind CSS 4** — via `@tailwindcss/vite`
- **PNG card faces** — purchased here https://www.gameart2d.com/playing-card-game-assets-pack.html
- **Vitest** — unit tests + browser component tests
- **Playwright** — E2E tests
- **Prettier + ESLint** — linting and formatting

## Development

```sh
git clone <repo-url>
cd sveltekit-solitaire
npm install
npm run dev
```

After changing routes or page structure, run `npx svelte-kit sync` to regenerate TypeScript types.

## Testing

```sh
# Unit + component tests (watch mode)
npm run test:unit

# All tests (single run)
npm test

# E2E tests
npm run test:e2e
```

## License

MIT

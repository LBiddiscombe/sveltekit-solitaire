# sveltekit-solitaire glossary

## Game variant

**Klondike** — the classic single-player card game. One deck of 52 cards arranged in 7 tableau columns, 4 foundation piles, a stock, and a waste pile.

**Draw 3** — clicking the stock deals three cards at a time to the waste pile. When the stock is empty, the waste flips back into the stock indefinitely (unlimited passes).

Cards may be moved from a foundation back to the tableau if the destination column follows building rules.

## Interaction

**Drag-and-drop** — players move cards by clicking and dragging to the target pile. Implemented via a Svelte action (`use:draggable`) using pointer events. **Tap** on a card auto-moves it to its foundation if a move is possible. Auto-moves animate; drag-drops snap into place.

**Solve** — a button that replaces the waste position when stock is empty, waste is empty, and every tableau card is face-up. Clicking it automates the remaining game by moving each bottom tableau card to its foundation at 100ms intervals until the game is won.

## Card

A card has a `suit` (spades, clubs, diamonds, hearts), a `rank` (a, 2–10, j, q, k), and a `faceUp` boolean. The CSS class name follows the pattern `pcard-{rank}{suit[0]}` (e.g. `pcard-as`, `pcard-kh`).

Each pile is an array of cards plus a `kind` tag (stock, waste, tableau, foundation). Rules are enforced by game logic, not the data structure.

## Game flow

No scoring or timer. Win state triggers a congratulations overlay with a new-game option.

## File layout

```
src/lib/
├── state/
│   └── game.svelte.ts       # game state (rune module)
├── actions/
│   └── dragdrop.ts          # drag + drop zone Svelte actions
├── components/
│   ├── Board.svelte         # top-level game layout
│   ├── Stock.svelte
│   ├── Waste.svelte
│   └── Pile.svelte          # used for both tableau and foundation
└── game/
    ├── rules.ts             # pure validation functions
    └── deck.ts              # shuffle, deal, deck creation
```

## Undo

Snapshot-based undo. The full game state is deep-cloned before each move. Undo restores the previous snapshot.

## Layout

Card size (`--card-width`, `--card-height`) is computed responsively from viewport width and the 223:324 card aspect ratio. The board uses a centered flex/grid layout with a capped max-width for desktop.

Board layout uses Tailwind utility classes. Custom CSS is limited to card-sizing variables and playing-card visuals.

**Top row** (left to right): foundations, waste, stock — chosen for right-handed mobile reach (top-right thumb zone). Stock and waste share a visual group; foundations sit left of the `justify-between` split.

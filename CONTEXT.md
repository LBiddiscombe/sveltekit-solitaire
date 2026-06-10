# Solitaire (Klondike)

## Language

**Draw Pile (Stock)**:
A face-down pile of cards remaining after the tableau has been dealt. Cards are drawn from the TOP of the stock (index 0 in the array) into the Waste pile in batches of 3.
_Avoid_: Stock pile (redundant "pile"), deck

**Waste Pile (Waste)**:
A face-up pile where drawn cards are placed. The array order equals display order: index 0 = leftmost (oldest draw), last index = rightmost (top, playable).
_Avoid_: Discard pile, talon

**Tableau**:
The 7-column layout of interleaved face-down and face-up cards, where cards are built in descending rank and alternating color.

**Foundation**:
The 4 piles in the top-left where each suit is built ascending from Ace to King. Cards may be moved off a foundation back onto the tableau (standard Klondike variant — not blocked in this game).

**Cascade**:
The visible vertical offset between consecutive cards in a pile, expressed as a fraction of card height. Face-down cards use a smaller cascade (0.08) than face-up cards (0.15) — just enough to show the card's existence or rank without wasting space.

**Recycle**:
When the Stock is empty, the entire Waste pile is turned face-down to become the new Stock. The order is preserved — the next draw produces the same sequence of batches as the original cycle.

**AnimationHost**:
The single module that owns all animation state (`animatingCard`, `busy`) and manages the clone lifecycle for card animations (deal, solve, auto-move, drag, flyback). Components import it directly for reactive state. Game model does not reference it.
_Avoid_: AnimationController, animController, inline orchestration in components

**Productive Hint (Tableau-to-Tableau)**:
A tableau-to-tableau move is considered productive enough to hint when it either (a) reveals a face-down card, (b) reveals a face-up card that can immediately move to a foundation, or (c) empties a column by moving its only remaining card (which is not a King). Moving a lone King between empty columns never reveals anything and is never hinted. The hint system does not evaluate moves 2+ steps deep.
_Rationale_: Prevents hint cycles where cards are shuffled between columns without advancing the game.

**Deadlocked**:
A game state where zero legal moves exist — no tableau/waste/foundation moves, and the stock is empty with no cards to recycle. The solver returns `nextMove: null`. The player sees a "Stuck" modal with Undo / Retry Same Deal / New Game buttons. Only reachable in `'winnable'` mode (hints hidden in `'random'` mode).
_Avoid_: Stuck (too vague — subsumes Deadlocked, Hopeless, and Uncertain)

**Hopeless**:
A game state where legal moves exist, but the solver has exhaustively proven that none of them lead to a solution (`status: 'unsolvable'` with `nextMove` non-null). The player sees a modal with Undo / Retry Same Deal / New Game buttons. Only shown in `'winnable'` mode. Undo steps back one move at a time — the player can re-request a hint from the earlier position.
_Avoid_: Stuck, dead end, lost

**Uncertain**:
A game state where the solver timed out before fully exploring all branches (`status: 'undetermined'`). It found a move that wasn't exhaustively disproven, but has no guarantee it leads to a win. Distinct from Deadlocked or Hopeless.

**SimulateStockCycle**:
A deep-clone simulation that runs up to 3 full stock recycles (draw → try each card against foundation then tableau → recycle) to determine whether any card can ever be placed. Used as the authoritative "game is truly dead" check: if it returns false, no amount of stock cycling will produce a move. Used to gate the New-Game confirmation dialog.
_Avoid_: hasImmediateMove (surface-level only, doesn't simulate cycling)

**Move Count (moveCount)**:
A monotonic counter of player-initiated move actions (draw, drag-drop, auto-move) within a single deal. Incremented in `drawFromStock()`, `endDrag()`, and `autoMove()`. Never decremented — not affected by undo/redo. Persisted with game state and restored on reload. Used to determine Skip-button eligibility (`moveCount === 0` shows Skip in winnable mode). Also recorded per-game in lifetime stats as `totalMoves` and displayed as `avgMoves` on the stats page.

**Difficulty Persistence**:
The `difficulty` badge (`easy`/`medium`/`hard` from the solver) is persisted in the saved game state alongside `moveCount`, `seed`, and `mode`. On reload, the badge is restored so the player still sees the difficulty label. Old saves without these fields default to `null` / `0`. This is the canonical fix: the Skip button was originally gated on `!canUndo`, which broke on reload because the undo stack is intentionally not persisted.

## Stats Tracking Contract

**Where stats live**: `src/lib/stats.ts` — client-side only, persisted to `localStorage` under key `solitaire-stats`.

**Data model**: `StatsData` has two mode-buckets (`random`/`winnable`), each with `lifetime` (aggregate counters) and `recent` (last 20 `GameResult` entries). Streaks (`currentStreak`, `bestStreak`) are cross-mode — a win in either mode extends the streak.

**When `recordGame()` is called**:

| Trigger                                                   | `won`   | `cardsToFoundation`      | `totalMoves`                 |
| --------------------------------------------------------- | ------- | ------------------------ | ---------------------------- |
| Win modal first appears (`game.isWon && celebrationDone`) | `true`  | `52`                     | `game.moveCount` at win time |
| Stuck/Hopeless dialog → Retry Same Deal                   | `false` | current foundation count | `game.moveCount`             |
| Stuck/Hopeless dialog → New Game                          | `false` | current foundation count | `game.moveCount`             |
| New Game confirm dialog → Confirm                         | `false` | current foundation count | `game.moveCount`             |

**Guarantees**:

- **Win is recorded at modal-open time** (reactive `$effect` in `Board.svelte`), not on button click. This ensures navigating to `/stats` from the win modal reflects the actual win, and navigating back does not lose it.
- **`game.winRecorded` flag** on the `Game` singleton prevents double-recording across component re-mounts (navigating away and back). Reset in `game.newGame()`.
- **Win modal "New Game" button** is guarded by `winBusy` to prevent double-click inflation.
- **Toolbar "+ New Game"** is disabled when `game.isWon` — prevents the celebration canvas (`pointer-events: none`) from passing clicks through to record a false loss.
- **Skip deal** (available when `moveCount === 0` in winnable mode) does NOT call `recordGame()` — the player hasn't invested any moves.
- **`moveCount` is monotonic** (never decremented by undo/redo) and recorded per-game as `totalMoves` in the stats `GameResult`, aggregated to `avgMoves` on the stats page.

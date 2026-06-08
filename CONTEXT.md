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
The 4 piles in the top-left where each suit is built ascending from Ace to King.

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

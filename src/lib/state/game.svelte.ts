import type { Card, PileRef, Rank, Suit } from '$lib/game/types';
import { createDeck, shuffle, deal, mulberry32 } from '$lib/game/deal';
import {
	canPlaceOnTableau,
	canPlaceOnFoundation,
	findMovesToFoundation,
	findMovesToTableau,
	canMoveFromTableau
} from '$lib/game/rules';

interface Snapshot {
	stock: Card[];
	waste: Card[];
	tableau: Card[][];
	foundations: Card[][];
}

export interface AnimatingCard {
	from: PileRef;
	to: PileRef;
	suit: Suit;
	rank: Rank;
}

function deepCloneCards(cards: Card[]): Card[] {
	return cards.map((c) => ({ ...c }));
}

export function generateDealPlan(): Array<{ column: number; faceUp: boolean }> {
	const plan: Array<{ column: number; faceUp: boolean }> = [];
	for (let col = 0; col < 7; col++) {
		for (let row = col; row < 7; row++) {
			plan.push({ column: row, faceUp: row === col });
		}
	}
	return plan;
}

class Game {
	stock = $state<Card[]>([]);
	waste = $state<Card[]>([]);
	tableau = $state<Card[][]>([[], [], [], [], [], [], []]);
	foundations = $state<Card[][]>([[], [], [], []]);

	undoStack = $state<Snapshot[]>([]);
	redoStack = $state<Snapshot[]>([]);

	dragging = $state<{
		from: PileRef;
		cardIndex: number;
		count: number;
	} | null>(null);

	lastAutoMove = $state<{
		from: PileRef;
		card: Card;
		to: PileRef;
	} | null>(null);

	busy = $state(false);
	animatingCard = $state<AnimatingCard | null>(null);

	seed = $state<number | undefined>(undefined);

	isWon = $derived(this.foundations.every((p) => p.length === 13));

	canSolve = $derived(
		this.stock.length === 0 &&
			this.waste.length === 0 &&
			this.tableau.every((col) => col.length === 0 || col.every((c) => c.faceUp))
	);

	canUndo = $derived(this.undoStack.length > 0);
	canRedo = $derived(this.redoStack.length > 0);

	newGame(seed?: number) {
		const rand = seed !== undefined ? mulberry32(seed) : Math.random;
		const deck = shuffle(createDeck(), rand);
		this.stock = deck;
		this.seed = seed;
		this.waste = [];
		this.tableau = [[], [], [], [], [], [], []];
		this.foundations = [[], [], [], []];
		this.undoStack = [];
		this.redoStack = [];
		this.dragging = null;
		this.lastAutoMove = null;
		this.busy = false;
		this.animatingCard = null;
	}

	skipDeal() {
		const dealt = deal(this.stock);
		this.stock = dealt.stock;
		this.tableau = dealt.tableau;
	}

	dealCardToTableau(column: number, faceUp: boolean) {
		const card = this.stock.shift();
		if (!card) return;
		card.faceUp = faceUp;
		this.tableau[column].push(card);
	}

	drawFromStock() {
		if (this.stock.length === 0) {
			this.stock = this.waste.reverse().map((c) => ({ ...c, faceUp: false }));
			this.waste = [];
			return;
		}

		this.saveSnapshot();
		const count = Math.min(3, this.stock.length);
		const drawn = this.stock.splice(-count, count);
		for (const card of drawn) {
			card.faceUp = true;
			this.waste.push(card);
		}
	}

	drawOneToWaste() {
		const card = this.stock.pop();
		if (!card) return;
		card.faceUp = true;
		this.waste.push(card);
	}

	recycleOneToStock() {
		const card = this.waste.pop();
		if (!card) return;
		card.faceUp = false;
		this.stock.unshift(card);
	}

	startDrag(ref: PileRef, cardIndex: number) {
		if (this.dragging || this.busy) return;
		const pile = this.getPile(ref);
		if (cardIndex < 0 || cardIndex >= pile.length) return;

		if (ref.kind === 'stock') return;
		if (ref.kind === 'waste' || ref.kind === 'foundation') {
			if (cardIndex !== pile.length - 1) return;
			if (!pile[cardIndex].faceUp) return;
			this.dragging = { from: ref, cardIndex, count: 1 };
			return;
		}

		if (ref.kind === 'tableau') {
			const card = pile[cardIndex];
			if (!card.faceUp) return;
			const cardsBelow = pile.slice(cardIndex + 1);
			if (!canMoveFromTableau(card, cardsBelow)) return;
			this.dragging = { from: ref, cardIndex, count: pile.length - cardIndex };
		}
	}

	cancelDrag() {
		this.dragging = null;
	}

	endDrag(to: PileRef): boolean {
		if (!this.dragging) return false;

		const { from, cardIndex, count } = this.dragging;
		this.dragging = null;

		const sourcePile = this.getPile(from);
		if (cardIndex >= sourcePile.length) return false;

		const movingCard = sourcePile[cardIndex];
		const targetPile = this.getPile(to);
		const topTarget = targetPile.length > 0 ? targetPile[targetPile.length - 1] : null;

		let valid = false;
		if (to.kind === 'tableau') {
			valid = canPlaceOnTableau(movingCard, topTarget);
		} else if (to.kind === 'foundation') {
			valid = count === 1 && canPlaceOnFoundation(movingCard, topTarget);
		}

		if (!valid) return false;

		this.saveSnapshot();

		const movedCards = sourcePile.splice(cardIndex, count);
		targetPile.push(...movedCards);

		if (from.kind === 'tableau' && sourcePile.length > 0) {
			const newTop = sourcePile[sourcePile.length - 1];
			if (!newTop.faceUp) {
				newTop.faceUp = true;
			}
		}

		return true;
	}

	findAutoMoveDestination(ref: PileRef, cardIndex: number): PileRef | null {
		const pile = this.getPile(ref);
		if (cardIndex < 0 || cardIndex >= pile.length) return null;
		const card = pile[cardIndex];
		if (!card.faceUp) return null;

		if (cardIndex === pile.length - 1) {
			const fi = findMovesToFoundation(card, this.foundations);
			if (fi !== null) return { kind: 'foundation', index: fi };
			const ti = findMovesToTableau(card, this.tableau);
			if (ti !== null) return { kind: 'tableau', index: ti };
			return null;
		}

		const cardsBelow = pile.slice(cardIndex + 1);
		if (!canMoveFromTableau(card, cardsBelow)) return null;
		const ti = findMovesToTableau(card, this.tableau);
		if (ti !== null) return { kind: 'tableau', index: ti };
		return null;
	}

	beginMove() {
		this.saveSnapshot();
	}

	canAutoMove(ref: PileRef, cardIndex: number): boolean {
		const pile = this.getPile(ref);
		if (cardIndex < 0 || cardIndex >= pile.length) return false;
		const card = pile[cardIndex];
		if (!card.faceUp) return false;

		if (cardIndex === pile.length - 1) {
			if (findMovesToFoundation(card, this.foundations) !== null) return true;
			if (findMovesToTableau(card, this.tableau) !== null) return true;
			return false;
		}

		const cardsBelow = pile.slice(cardIndex + 1);
		if (!canMoveFromTableau(card, cardsBelow)) return false;
		return findMovesToTableau(card, this.tableau) !== null;
	}

	autoMove(ref: PileRef, cardIndex: number): boolean {
		const pile = this.getPile(ref);
		if (cardIndex < 0 || cardIndex >= pile.length) return false;
		const card = pile[cardIndex];
		if (!card.faceUp) return false;

		if (cardIndex === pile.length - 1) {
			const foundationIndex = findMovesToFoundation(card, this.foundations);
			if (foundationIndex !== null) {
				this.saveSnapshot();
				const [moved] = pile.splice(cardIndex, 1);
				this.foundations[foundationIndex].push(moved);
				if (ref.kind === 'tableau' && pile.length > 0) {
					const newTop = pile[pile.length - 1];
					if (!newTop.faceUp) {
						newTop.faceUp = true;
					}
				}
				this.lastAutoMove = {
					from: ref,
					card: moved,
					to: { kind: 'foundation', index: foundationIndex }
				};
				return true;
			}

			const tableauIndex = findMovesToTableau(card, this.tableau);
			if (tableauIndex !== null) {
				this.saveSnapshot();
				const [moved] = pile.splice(cardIndex, 1);
				this.tableau[tableauIndex].push(moved);
				if (ref.kind === 'tableau' && pile.length > 0) {
					const newTop = pile[pile.length - 1];
					if (!newTop.faceUp) {
						newTop.faceUp = true;
					}
				}
				this.lastAutoMove = {
					from: ref,
					card: moved,
					to: { kind: 'tableau', index: tableauIndex }
				};
				return true;
			}

			return false;
		}

		const cardsBelow = pile.slice(cardIndex + 1);
		if (!canMoveFromTableau(card, cardsBelow)) return false;

		const tableauIndex = findMovesToTableau(card, this.tableau);
		if (tableauIndex === null) return false;

		this.saveSnapshot();
		const count = pile.length - cardIndex;
		const movedCards = pile.splice(cardIndex, count);
		this.tableau[tableauIndex].push(...movedCards);

		if (ref.kind === 'tableau' && pile.length > 0) {
			const newTop = pile[pile.length - 1];
			if (!newTop.faceUp) {
				newTop.faceUp = true;
			}
		}

		this.lastAutoMove = {
			from: ref,
			card: movedCards[0],
			to: { kind: 'tableau', index: tableauIndex }
		};
		return true;
	}

	peekSolveMove(): { column: number; foundationIndex: number } | null {
		for (let i = 0; i < 7; i++) {
			const col = this.tableau[i];
			if (col.length === 0) continue;
			const card = col[col.length - 1];
			const fi = findMovesToFoundation(card, this.foundations);
			if (fi !== null) {
				return { column: i, foundationIndex: fi };
			}
		}
		return null;
	}

	solveTickAt(column: number, foundationIndex: number): boolean {
		const col = this.tableau[column];
		if (col.length === 0) return false;
		const card = col[col.length - 1];
		if (findMovesToFoundation(card, this.foundations) !== foundationIndex) return false;
		col.pop();
		this.foundations[foundationIndex].push(card);
		if (col.length > 0) {
			col[col.length - 1].faceUp = true;
		}
		this.lastAutoMove = {
			from: { kind: 'tableau', index: column },
			card,
			to: { kind: 'foundation', index: foundationIndex }
		};
		return true;
	}

	solveTick(): boolean {
		const move = this.peekSolveMove();
		if (!move) return false;
		return this.solveTickAt(move.column, move.foundationIndex);
	}

	clearAutoMoveIndicator() {
		this.lastAutoMove = null;
	}

	undo() {
		if (this.undoStack.length === 0 || this.busy) return;
		this.redoStack.push(this.snapshot());
		const snap = this.undoStack.pop()!;
		this.stock = snap.stock;
		this.waste = snap.waste;
		this.tableau = snap.tableau;
		this.foundations = snap.foundations;
		this.dragging = null;
	}

	redo() {
		if (this.redoStack.length === 0 || this.busy) return;
		this.undoStack.push(this.snapshot());
		const snap = this.redoStack.pop()!;
		this.stock = snap.stock;
		this.waste = snap.waste;
		this.tableau = snap.tableau;
		this.foundations = snap.foundations;
		this.dragging = null;
	}

	getPile(ref: PileRef): Card[] {
		switch (ref.kind) {
			case 'stock':
				return this.stock;
			case 'waste':
				return this.waste;
			case 'tableau':
				return this.tableau[ref.index];
			case 'foundation':
				return this.foundations[ref.index];
		}
	}

	private snapshot(): Snapshot {
		return {
			stock: deepCloneCards(this.stock),
			waste: deepCloneCards(this.waste),
			tableau: this.tableau.map((p) => deepCloneCards(p)),
			foundations: this.foundations.map((p) => deepCloneCards(p))
		};
	}

	private saveSnapshot() {
		this.redoStack = [];
		this.undoStack.push(this.snapshot());
		if (this.undoStack.length > 100) {
			this.undoStack.shift();
		}
	}
}

export const game = new Game();

import type { Card, PileRef } from '$lib/game/types';
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
		const dealt = deal(deck);
		this.stock = dealt.stock;
		this.waste = [];
		this.tableau = dealt.tableau;
		this.foundations = [[], [], [], []];
		this.undoStack = [];
		this.redoStack = [];
		this.dragging = null;
		this.lastAutoMove = null;
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

	startDrag(ref: PileRef, cardIndex: number) {
		if (this.dragging) return;
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

	solveTick(): boolean {
		for (let i = 0; i < 7; i++) {
			const col = this.tableau[i];
			if (col.length === 0) continue;
			const card = col[col.length - 1];
			const foundationIndex = findMovesToFoundation(card, this.foundations);
			if (foundationIndex !== null) {
				col.pop();
				this.foundations[foundationIndex].push(card);
				if (col.length > 0) {
					col[col.length - 1].faceUp = true;
				}
				return true;
			}
		}
		return false;
	}

	clearAutoMoveIndicator() {
		this.lastAutoMove = null;
	}

	undo() {
		if (this.undoStack.length === 0) return;
		this.redoStack.push(this.snapshot());
		const snap = this.undoStack.pop()!;
		this.stock = snap.stock;
		this.waste = snap.waste;
		this.tableau = snap.tableau;
		this.foundations = snap.foundations;
		this.dragging = null;
	}

	redo() {
		if (this.redoStack.length === 0) return;
		this.undoStack.push(this.snapshot());
		const snap = this.redoStack.pop()!;
		this.stock = snap.stock;
		this.waste = snap.waste;
		this.tableau = snap.tableau;
		this.foundations = snap.foundations;
		this.dragging = null;
	}

	private getPile(ref: PileRef): Card[] {
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
			stock: this.stock.map((c) => ({ ...c })),
			waste: this.waste.map((c) => ({ ...c })),
			tableau: this.tableau.map((p) => p.map((c) => ({ ...c }))),
			foundations: this.foundations.map((p) => p.map((c) => ({ ...c })))
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

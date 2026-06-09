import { browser } from '$app/environment';
import type { Card, PileRef } from '$lib/game/types';
import { createDeck, shuffle, deal, mulberry32 } from '$lib/game/deal';

const STORAGE_KEY = 'solitaire-game';
import {
	canPlaceOnTableau,
	canPlaceOnFoundation,
	findMovesToFoundation,
	findMovesToTableau,
	canMoveFromTableau
} from '$lib/game/rules';

import { deepClone, type GameSnapshot } from '$lib/game/snapshot';
import type { SolverMove, SolvableStatus } from '$lib/game/solver/types';

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

	hasSaved = $state(false);

	undoStack = $state<GameSnapshot[]>([]);
	redoStack = $state<GameSnapshot[]>([]);

	/** Debug: full solution path from the solver (only populated in debug mode) */
	solutionMoves = $state<SolverMove[]>([]);
	solutionIndex = $state(0);
	solutionStack = $state<GameSnapshot[]>([]);
	solutionStatus = $state<SolvableStatus | null>(null);
	solvingInProgress = $state(false);
	debugMode = $state(false);

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

	seed = $state<number | undefined>(undefined);

	hint = $state<Hint | null>(null);

	hintLoading = $state(false);

	isWon = $derived(this.foundations.every((p) => p.length === 13));

	private persistTimer: ReturnType<typeof setTimeout> | null = null;

	canSolve = $derived(
		this.stock.length === 0 &&
			this.waste.length === 0 &&
			this.tableau.every((col) => col.length === 0 || col.every((c) => c.faceUp))
	);

	canUndo = $derived(this.undoStack.length > 0);
	canRedo = $derived(this.redoStack.length > 0);

	newGame(seed?: number) {
		this.clearSaved();
		this.hasSaved = false;
		this.clearSolution();
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
		this.hint = null;
	}

	skipDeal() {
		this.clearHint();
		this.clearSolution();
		const dealt = deal(this.stock);
		this.stock = dealt.stock;
		this.tableau = dealt.tableau;
	}

	dealCardToTableau(column: number, faceUp: boolean) {
		this.clearHint();
		const card = this.stock.shift();
		if (!card) return;
		card.faceUp = faceUp;
		this.tableau[column].push(card);
	}

	drawFromStock() {
		this.clearHint();
		this.clearSolution();
		if (this.stock.length === 0) {
			this.stock = this.waste.map((c) => ({ ...c, faceUp: false }));
			this.waste = [];
			this.persist();
			return;
		}

		this.saveSnapshot();
		const count = Math.min(3, this.stock.length);
		const drawn = this.stock.splice(0, count);
		for (const card of drawn) {
			card.faceUp = true;
			this.waste.push(card);
		}
		this.persist();
	}

	drawOneToWaste() {
		const card = this.stock.pop();
		if (!card) return;
		card.faceUp = true;
		this.waste.push(card);
		this.clearHint();
		this.persist();
	}

	recycleOneToStock() {
		const card = this.waste.pop();
		if (!card) return;
		card.faceUp = false;
		this.stock.unshift(card);
		this.clearHint();
		this.persist();
	}

	startDrag(ref: PileRef, cardIndex: number) {
		if (this.dragging) return;
		this.clearHint();
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
		this.clearHint();
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

		this.clearHint();
		this.clearSolution();
		this.saveSnapshot();

		const movedCards = sourcePile.splice(cardIndex, count);
		targetPile.push(...movedCards);

		if (from.kind === 'tableau' && sourcePile.length > 0) {
			const newTop = sourcePile[sourcePile.length - 1];
			if (!newTop.faceUp) {
				newTop.faceUp = true;
			}
		}

		this.persist();
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
		this.clearHint();
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
		this.clearHint();
		this.clearSolution();
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
				this.persist();
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
				this.persist();
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
		this.persist();
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
		this.clearHint();
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
		this.persist();
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

	clearHint() {
		this.hint = null;
	}

	undo() {
		this.clearHint();
		this.clearSolution();
		if (this.undoStack.length === 0) return;
		this.redoStack.push(this.snapshot());
		const snap = this.undoStack.pop()!;
		this.stock = snap.stock;
		this.waste = snap.waste;
		this.tableau = snap.tableau;
		this.foundations = snap.foundations;
		this.dragging = null;
		this.persist();
	}

	redo() {
		this.clearHint();
		this.clearSolution();
		if (this.redoStack.length === 0) return;
		this.undoStack.push(this.snapshot());
		const snap = this.redoStack.pop()!;
		this.stock = snap.stock;
		this.waste = snap.waste;
		this.tableau = snap.tableau;
		this.foundations = snap.foundations;
		this.dragging = null;
		this.persist();
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

	private snapshot(): GameSnapshot {
		return deepClone({
			stock: this.stock,
			waste: this.waste,
			tableau: this.tableau,
			foundations: this.foundations
		});
	}

	private writePersist() {
		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					stock: this.stock,
					waste: this.waste,
					tableau: this.tableau,
					foundations: this.foundations,
					seed: this.seed
				})
			);
		} catch {
			/* best-effort */
		}
	}

	persist() {
		if (!browser || this.isWon) {
			if (this.isWon) this.clearSaved();
			return;
		}
		if (this.persistTimer !== null) clearTimeout(this.persistTimer);
		this.persistTimer = setTimeout(() => {
			this.persistTimer = null;
			this.writePersist();
		}, 5_000);
	}

	flushPersist() {
		if (this.persistTimer !== null) {
			clearTimeout(this.persistTimer);
			this.persistTimer = null;
			this.writePersist();
		}
	}

	private clearSaved() {
		if (!browser) return;
		if (this.persistTimer !== null) {
			clearTimeout(this.persistTimer);
			this.persistTimer = null;
		}
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch {
			/* best-effort */
		}
	}

	private saveSnapshot() {
		this.redoStack = [];
		this.undoStack.push(this.snapshot());
		if (this.undoStack.length > 100) {
			this.undoStack.shift();
		}
	}

	loadSolution(moves: SolverMove[], status: SolvableStatus) {
		this.solutionMoves = moves;
		this.solutionStatus = status;
		this.solutionIndex = 0;
		this.solutionStack = [];
		this.solvingInProgress = false;
	}

	clearSolution() {
		this.solutionMoves = [];
		this.solutionStatus = null;
		this.solutionIndex = 0;
		this.solutionStack = [];
	}

	applySolverMove(move: SolverMove) {
		this.clearHint();

		if (move.kind === 'draw') {
			const count = Math.min(3, this.stock.length);
			const drawn = this.stock.splice(0, count);
			for (const card of drawn) {
				card.faceUp = true;
				this.waste.push(card);
			}
		} else if (move.kind === 'recycle') {
			this.stock = this.waste.map((c) => ({ ...c, faceUp: false }));
			this.waste = [];
		} else {
			const { from, cardIndex, count, to } = move;
			const sourcePile = this.getPile(from);
			const targetPile = this.getPile(to);
			const movedCards = sourcePile.splice(cardIndex, count);
			targetPile.push(...movedCards);
			if (from.kind === 'tableau' && sourcePile.length > 0) {
				const newTop = sourcePile[sourcePile.length - 1];
				if (!newTop.faceUp) {
					newTop.faceUp = true;
				}
			}
		}
	}

	stepForward(): SolverMove | null {
		if (this.solutionIndex >= this.solutionMoves.length) return null;
		const move = this.solutionMoves[this.solutionIndex];
		this.solutionStack.push(this.snapshot());
		this.applySolverMove(move);
		this.solutionIndex++;
		return move;
	}

	stepBackward(): boolean {
		if (this.solutionIndex <= 0 || this.solutionStack.length === 0) return false;
		this.solutionIndex--;
		const snap = this.solutionStack.pop()!;
		this.stock = snap.stock;
		this.waste = snap.waste;
		this.tableau = snap.tableau;
		this.foundations = snap.foundations;
		return true;
	}

	stepToStart() {
		while (this.stepBackward()) {
			/* repeat */
		}
	}

	stepToEnd() {
		while (this.stepForward() !== null) {
			/* repeat */
		}
	}
}

export interface Hint {
	from: PileRef;
	fromCardIndex: number;
	to: PileRef;
	card: Card;
}

export const game = new Game();

export function persistAfterDeal() {
	game.persist();
}

if (browser) {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const data = JSON.parse(raw);
			game.stock = data.stock;
			game.waste = data.waste;
			game.tableau = data.tableau;
			game.foundations = data.foundations;
			game.undoStack = data.undoStack ?? [];
			game.redoStack = data.redoStack ?? [];
			game.seed = data.seed;
			game.hasSaved = true;
		}
	} catch {
		/* best-effort */
	}
	window.addEventListener('beforeunload', () => game.flushPersist());
}

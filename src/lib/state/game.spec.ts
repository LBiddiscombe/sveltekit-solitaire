import { describe, it, expect, beforeEach } from 'vitest';
import { game } from './game.svelte';
import type { Card, PileRef } from '$lib/game/types';

beforeEach(() => {
	game.newGame(42);
});

describe('Game', () => {
	describe('newGame', () => {
		it('creates 7 empty tableau columns', () => {
			expect(game.tableau).toHaveLength(7);
			expect(game.tableau.every((col) => col.length === 0)).toBe(true);
		});

		it('starts with empty waste and foundations', () => {
			expect(game.waste).toHaveLength(0);
			expect(game.foundations.every((f) => f.length === 0)).toBe(true);
		});

		it('starts with all 52 cards in stock', () => {
			expect(game.stock).toHaveLength(52);
		});

		it('clears undo and redo stacks', () => {
			game.drawFromStock();
			expect(game.canUndo).toBe(true);
			game.newGame();
			expect(game.canUndo).toBe(false);
			expect(game.canRedo).toBe(false);
		});
	});

	describe('drawFromStock', () => {
		it('moves 3 cards from stock to waste and marks them face-up', () => {
			game.drawFromStock();
			expect(game.waste).toHaveLength(3);
			expect(game.stock).toHaveLength(49);
			expect(game.waste.every((c) => c.faceUp)).toBe(true);
		});

		it('draws remaining cards when stock has less than 3', () => {
			game.stock = game.stock.slice(0, 2);
			game.waste = [];
			game.drawFromStock();
			expect(game.stock).toHaveLength(0);
			expect(game.waste).toHaveLength(2);
		});

		it('recycles waste into stock when stock is empty', () => {
			game.stock = [];
			game.waste = [
				{ suit: 'hearts', rank: 'a', faceUp: true },
				{ suit: 'spades', rank: 'k', faceUp: true }
			];
			game.drawFromStock();
			expect(game.waste).toHaveLength(0);
			expect(game.stock).toHaveLength(2);
			expect(game.stock.every((c) => !c.faceUp)).toBe(true);
		});
	});

	describe('startDrag / cancelDrag', () => {
		it('starts drag from tableau for a face-up card', () => {
			const ref: PileRef = { kind: 'tableau', index: 6 };
			game.tableau[6] = [{ suit: 'hearts', rank: 'k', faceUp: true }];
			game.startDrag(ref, 0);
			expect(game.dragging).not.toBeNull();
			expect(game.dragging!.from).toEqual(ref);
		});

		it('rejects drag from stock', () => {
			const ref: PileRef = { kind: 'stock', index: 0 };
			game.startDrag(ref, 0);
			expect(game.dragging).toBeNull();
		});

		it('rejects drag of face-down card from tableau', () => {
			const ref: PileRef = { kind: 'tableau', index: 6 };
			game.tableau[6] = [{ suit: 'spades', rank: 'a', faceUp: false }];
			game.startDrag(ref, 0);
			expect(game.dragging).toBeNull();
		});

		it('cancelDrag clears dragging state', () => {
			const ref: PileRef = { kind: 'tableau', index: 6 };
			game.tableau[6] = [{ suit: 'hearts', rank: 'k', faceUp: true }];
			game.startDrag(ref, 0);
			expect(game.dragging).not.toBeNull();
			game.cancelDrag();
			expect(game.dragging).toBeNull();
		});
	});

	describe('endDrag — moving cards between piles', () => {
		it('moves a king to an empty tableau column', () => {
			game.tableau[0] = [{ suit: 'hearts', rank: 'k', faceUp: true }];
			const fromRef: PileRef = { kind: 'tableau', index: 0 };
			const toRef: PileRef = { kind: 'tableau', index: 1 };
			game.tableau[1] = [];
			game.startDrag(fromRef, 0);
			const result = game.endDrag(toRef);
			expect(result).toBe(true);
			expect(game.tableau[0]).toHaveLength(0);
			expect(game.tableau[1]).toHaveLength(1);
		});

		it('rejects invalid drop and returns false', () => {
			const fromRef: PileRef = { kind: 'tableau', index: 6 };
			const toRef: PileRef = { kind: 'foundation', index: 0 };
			game.startDrag(fromRef, game.tableau[6].length - 1);
			const result = game.endDrag(toRef);
			expect(result).toBe(false);
		});

		it('allows only single card to foundation (ace to empty)', () => {
			game.tableau[0] = [
				{ suit: 'clubs', rank: 'q', faceUp: true },
				{ suit: 'diamonds', rank: 'a', faceUp: true }
			];
			const fromRef: PileRef = { kind: 'tableau', index: 0 };
			const toRef: PileRef = { kind: 'foundation', index: 0 };
			game.startDrag(fromRef, 1);
			const result = game.endDrag(toRef);
			expect(result).toBe(true);
			expect(game.foundations[0]).toHaveLength(1);
			expect(game.foundations[0][0].rank).toBe('a');
		});

		it('flips the new top card after moving from tableau', () => {
			game.tableau[2] = [
				{ suit: 'spades', rank: 'q', faceUp: false },
				{ suit: 'hearts', rank: 'k', faceUp: true }
			];
			game.tableau[1] = [];
			const fromRef: PileRef = { kind: 'tableau', index: 2 };
			const toRef: PileRef = { kind: 'tableau', index: 1 };
			game.startDrag(fromRef, 1);
			game.endDrag(toRef);
			expect(game.tableau[2][0].faceUp).toBe(true);
		});
	});

	describe('autoMove', () => {
		it('moves an ace to an empty foundation', () => {
			game.waste = [{ suit: 'spades', rank: 'a', faceUp: true }];
			const ref: PileRef = { kind: 'waste', index: 0 };
			const result = game.autoMove(ref, 0);
			expect(result).toBe(true);
			expect(game.foundations[0]).toHaveLength(1);
			expect(game.foundations[0][0].rank).toBe('a');
		});

		it('moves 2 of spades onto ace of spades foundation', () => {
			game.foundations[0] = [{ suit: 'spades', rank: 'a', faceUp: true }];
			game.waste = [{ suit: 'spades', rank: '2', faceUp: true }];
			const ref: PileRef = { kind: 'waste', index: 0 };
			const result = game.autoMove(ref, 0);
			expect(result).toBe(true);
			expect(game.foundations[0]).toHaveLength(2);
			expect(game.foundations[0][1].rank).toBe('2');
		});

		it('returns false when card cannot move to any foundation or tableau', () => {
			game.tableau = [
				[{ suit: 'spades', rank: '3', faceUp: true }],
				[{ suit: 'clubs', rank: '3', faceUp: true }],
				[{ suit: 'diamonds', rank: '3', faceUp: true }],
				[{ suit: 'hearts', rank: '3', faceUp: true }],
				[{ suit: 'spades', rank: '4', faceUp: true }],
				[{ suit: 'clubs', rank: '4', faceUp: true }],
				[{ suit: 'diamonds', rank: '4', faceUp: true }]
			];
			game.waste = [{ suit: 'spades', rank: 'k', faceUp: true }];
			const ref: PileRef = { kind: 'waste', index: 0 };
			const result = game.autoMove(ref, 0);
			expect(result).toBe(false);
			expect(game.waste).toHaveLength(1);
		});

		it('moves a king to an empty tableau column when no foundation is available', () => {
			game.tableau = [
				[{ suit: 'spades', rank: '3', faceUp: true }],
				[{ suit: 'clubs', rank: '3', faceUp: true }],
				[],
				[{ suit: 'hearts', rank: '3', faceUp: true }],
				[{ suit: 'spades', rank: '4', faceUp: true }],
				[{ suit: 'clubs', rank: '4', faceUp: true }],
				[{ suit: 'hearts', rank: 'k', faceUp: true }]
			];
			const ref: PileRef = { kind: 'tableau', index: 6 };
			const result = game.autoMove(ref, 0);
			expect(result).toBe(true);
			expect(game.tableau[6]).toHaveLength(0);
			expect(game.tableau[2]).toHaveLength(1);
			expect(game.tableau[2][0].rank).toBe('k');
		});

		it('returns false for face-down card', () => {
			game.tableau[0] = [{ suit: 'spades', rank: 'a', faceUp: false }];
			const ref: PileRef = { kind: 'tableau', index: 0 };
			const result = game.autoMove(ref, 0);
			expect(result).toBe(false);
		});

		it('prefers foundation over tableau when both are available', () => {
			game.tableau[2] = [{ suit: 'spades', rank: 'a', faceUp: true }];
			game.tableau[3] = [{ suit: 'hearts', rank: 'a', faceUp: true }];
			game.foundations[0] = [{ suit: 'diamonds', rank: 'a', faceUp: true }];
			game.waste = [{ suit: 'diamonds', rank: '2', faceUp: true }];
			const ref: PileRef = { kind: 'waste', index: 0 };
			const result = game.autoMove(ref, 0);
			expect(result).toBe(true);
			expect(game.foundations[0]).toHaveLength(2);
			expect(game.tableau[2]).toHaveLength(1);
		});

		it('moves a king with cards on top to an empty tableau column', () => {
			game.tableau = [
				[{ suit: 'spades', rank: '3', faceUp: true }],
				[{ suit: 'clubs', rank: '3', faceUp: true }],
				[],
				[{ suit: 'hearts', rank: '3', faceUp: true }],
				[{ suit: 'spades', rank: '4', faceUp: true }],
				[{ suit: 'clubs', rank: '4', faceUp: true }],
				[
					{ suit: 'spades', rank: 'k', faceUp: true },
					{ suit: 'hearts', rank: 'q', faceUp: true },
					{ suit: 'spades', rank: 'j', faceUp: true }
				]
			];
			const ref: PileRef = { kind: 'tableau', index: 6 };
			const result = game.autoMove(ref, 0);
			expect(result).toBe(true);
			expect(game.tableau[6]).toHaveLength(0);
			expect(game.tableau[2]).toHaveLength(3);
			expect(game.tableau[2].map((c) => c.rank)).toEqual(['k', 'q', 'j']);
		});

		it('moves a sequence onto a matching tableau column', () => {
			game.tableau = game.tableau.map(() => []);
			game.tableau[1] = [{ suit: 'clubs', rank: '7', faceUp: true }];
			game.tableau[6] = [
				{ suit: 'hearts', rank: '6', faceUp: true },
				{ suit: 'spades', rank: '5', faceUp: true }
			];
			const ref: PileRef = { kind: 'tableau', index: 6 };
			const result = game.autoMove(ref, 0);
			expect(result).toBe(true);
			expect(game.tableau[6]).toHaveLength(0);
			expect(game.tableau[1]).toHaveLength(3);
			expect(game.tableau[1].map((c) => c.rank)).toEqual(['7', '6', '5']);
		});
	});

	describe('undo / redo', () => {
		it('undo restores state before a move', () => {
			const stockBefore = game.stock.map((c) => ({ ...c }));
			const wasteBefore = game.waste.map((c) => ({ ...c }));
			game.drawFromStock();
			game.undo();
			expect(game.stock).toEqual(stockBefore);
			expect(game.waste).toEqual(wasteBefore);
		});

		it('redo restores state after undo', () => {
			game.drawFromStock();
			const afterDraw = [...game.stock];
			game.undo();
			expect(game.stock).not.toEqual(afterDraw);
			game.redo();
			expect(game.stock).toEqual(afterDraw);
		});

		it('undo does nothing when stack is empty', () => {
			expect(game.canUndo).toBe(false);
			game.undo();
			expect(game.canUndo).toBe(false);
		});

		it('a new move clears redo stack', () => {
			game.drawFromStock();
			game.undo();
			expect(game.canRedo).toBe(true);
			game.drawFromStock();
			expect(game.canRedo).toBe(false);
		});

		it('canUndo and canRedo reflect stack state', () => {
			expect(game.canUndo).toBe(false);
			expect(game.canRedo).toBe(false);
			game.drawFromStock();
			expect(game.canUndo).toBe(true);
			expect(game.canRedo).toBe(false);
			game.undo();
			expect(game.canUndo).toBe(false);
			expect(game.canRedo).toBe(true);
		});
	});

	describe('isWon', () => {
		it('is false when not all foundations are complete', () => {
			expect(game.isWon).toBe(false);
		});

		it('is true when all foundations have 13 cards', () => {
			const suits: Card['suit'][] = ['spades', 'clubs', 'diamonds', 'hearts'];
			const ranks: Card['rank'][] = [
				'a',
				'2',
				'3',
				'4',
				'5',
				'6',
				'7',
				'8',
				'9',
				'10',
				'j',
				'q',
				'k'
			];
			const full: Card[] = [];
			for (const suit of suits) {
				for (const rank of ranks) {
					full.push({ suit, rank, faceUp: true });
				}
			}
			game.foundations = [
				full.filter((c) => c.suit === 'spades'),
				full.filter((c) => c.suit === 'clubs'),
				full.filter((c) => c.suit === 'diamonds'),
				full.filter((c) => c.suit === 'hearts')
			];
			expect(game.isWon).toBe(true);
		});
	});

	describe('clearAutoMoveIndicator', () => {
		it('clears lastAutoMove after setting it', () => {
			game.waste = [{ suit: 'spades', rank: 'a', faceUp: true }];
			game.autoMove({ kind: 'waste', index: 0 }, 0);
			expect(game.lastAutoMove).not.toBeNull();
			game.clearAutoMoveIndicator();
			expect(game.lastAutoMove).toBeNull();
		});
	});

	describe('canSolve', () => {
		it('is false when stock has cards', () => {
			expect(game.canSolve).toBe(false);
		});

		it('is false when waste has cards', () => {
			game.stock = [];
			game.waste = [{ suit: 'spades', rank: 'a', faceUp: true }];
			expect(game.canSolve).toBe(false);
		});

		it('is false when any tableau card is face-down', () => {
			game.stock = [];
			game.waste = [];
			game.tableau[0] = [{ suit: 'spades', rank: 'a', faceUp: false }];
			expect(game.canSolve).toBe(false);
		});

		it('is true when stock and waste are empty and all tableau cards are face-up', () => {
			game.stock = [];
			game.waste = [];
			game.tableau[0] = [{ suit: 'spades', rank: 'a', faceUp: true }];
			expect(game.canSolve).toBe(true);
		});

		it('is true when all tableau columns are empty', () => {
			game.stock = [];
			game.waste = [];
			expect(game.canSolve).toBe(true);
		});
	});

	describe('solveTick', () => {
		it('moves a card from tableau to foundation', () => {
			game.stock = [];
			game.waste = [];
			game.foundations[0] = [{ suit: 'spades', rank: 'a', faceUp: true }];
			game.tableau[3] = [{ suit: 'spades', rank: '2', faceUp: true }];
			const result = game.solveTick();
			expect(result).toBe(true);
			expect(game.foundations[0]).toHaveLength(2);
			expect(game.foundations[0][1].rank).toBe('2');
			expect(game.tableau[3]).toHaveLength(0);
		});

		it('flips the card below after moving the top card', () => {
			game.stock = [];
			game.waste = [];
			game.tableau[0] = [
				{ suit: 'clubs', rank: 'k', faceUp: true },
				{ suit: 'spades', rank: '2', faceUp: true }
			];
			game.foundations[0] = [{ suit: 'spades', rank: 'a', faceUp: true }];
			const result = game.solveTick();
			expect(result).toBe(true);
			expect(game.foundations[0]).toHaveLength(2);
			expect(game.foundations[0][1].rank).toBe('2');
			expect(game.tableau[0]).toHaveLength(1);
			expect(game.tableau[0][0].faceUp).toBe(true);
		});

		it('returns false when no card can move to any foundation', () => {
			game.stock = [];
			game.waste = [];
			game.foundations = [
				[{ suit: 'spades', rank: 'k', faceUp: true }],
				[{ suit: 'clubs', rank: 'k', faceUp: true }],
				[{ suit: 'diamonds', rank: 'k', faceUp: true }],
				[{ suit: 'hearts', rank: 'k', faceUp: true }]
			];
			expect(game.solveTick()).toBe(false);
		});

		it('moves cards until no more moves are possible then returns false', () => {
			game.stock = [];
			game.waste = [];
			game.foundations[0] = [];
			game.tableau = [[], [], [], [], [], [], []];
			const suits = ['spades', 'clubs', 'diamonds', 'hearts'] as const;
			for (let s = 0; s < 4; s++) {
				game.tableau[s] = [{ suit: suits[s], rank: 'a', faceUp: true }];
			}
			expect(game.solveTick()).toBe(true);
			expect(game.solveTick()).toBe(true);
			expect(game.solveTick()).toBe(true);
			expect(game.solveTick()).toBe(true);
			expect(game.solveTick()).toBe(false);
			for (let i = 0; i < 4; i++) {
				expect(game.foundations[i]).toHaveLength(1);
			}
		});

		it('does not save snapshots (no undo pollution)', () => {
			game.stock = [];
			game.waste = [];
			const undoCount = game.undoStack.length;
			game.foundations[0] = [{ suit: 'spades', rank: 'a', faceUp: true }];
			game.tableau[3] = [{ suit: 'spades', rank: '2', faceUp: true }];
			game.solveTick();
			expect(game.undoStack).toHaveLength(undoCount);
		});
	});

	describe('findBestHint', () => {
		it('returns null when no moves are possible', () => {
			game.tableau = [[], [], [], [], [], [], []];
			game.stock = [];
			game.waste = [];
			expect(game.findBestHint()).toBeNull();
		});

		it('returns waste top card as fromCardIndex for waste-to-tableau', () => {
			game.tableau = [
				[{ suit: 'clubs', rank: '7', faceUp: true }],
				[],
				[{ suit: 'clubs', rank: '3', faceUp: true }],
				[{ suit: 'diamonds', rank: '3', faceUp: true }],
				[{ suit: 'hearts', rank: '3', faceUp: true }],
				[{ suit: 'spades', rank: '4', faceUp: true }],
				[{ suit: 'hearts', rank: 'k', faceUp: true }]
			];
			game.stock = [];
			game.waste = [
				{ suit: 'hearts', rank: '2', faceUp: true },
				{ suit: 'diamonds', rank: '6', faceUp: true }
			];
			const hint = game.findBestHint();
			expect(hint).not.toBeNull();
			expect(hint!.from.kind).toBe('waste');
			expect(hint!.fromCardIndex).toBe(1);
			expect(hint!.to.kind).toBe('tableau');
		});

		it('returns stock hint when no other move exists and stock is non-empty', () => {
			game.tableau = [[], [], [], [], [], [], []];
			game.waste = [];
			const hint = game.findBestHint();
			expect(hint).not.toBeNull();
			expect(hint!.from.kind).toBe('stock');
		});

		it('prefers tableau-to-foundation over waste-to-tableau', () => {
			game.tableau = [[{ suit: 'spades', rank: 'a', faceUp: true }], [], [], [], [], [], []];
			game.foundations = [[], [], [], []];
			game.waste = [{ suit: 'hearts', rank: '2', faceUp: true }];
			const hint = game.findBestHint();
			expect(hint).not.toBeNull();
			expect(hint!.from.kind).toBe('tableau');
			expect(hint!.to.kind).toBe('foundation');
		});
	});
});

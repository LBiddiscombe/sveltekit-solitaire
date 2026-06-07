import { describe, it, expect, beforeEach } from 'vitest';
import { game } from './game.svelte';
import type { Card, PileRef } from '$lib/game/types';

beforeEach(() => {
	game.newGame();
});

function topCard(pile: Card[]): Card | null {
	return pile.length > 0 ? pile[pile.length - 1] : null;
}

describe('Game', () => {
	describe('newGame', () => {
		it('creates 7 tableau columns with correct sizing', () => {
			expect(game.tableau).toHaveLength(7);
			expect(game.tableau[0]).toHaveLength(1);
			expect(game.tableau[6]).toHaveLength(7);
		});

		it('all tableau columns have the top card face-up', () => {
			for (const col of game.tableau) {
				expect(topCard(col)!.faceUp).toBe(true);
			}
		});

		it('starts with empty waste and foundations', () => {
			expect(game.waste).toHaveLength(0);
			expect(game.foundations.every((f) => f.length === 0)).toBe(true);
		});

		it('starts with 24 cards in stock', () => {
			expect(game.stock).toHaveLength(24);
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
			expect(game.stock).toHaveLength(21);
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
			const lastIdx = game.tableau[6].length - 1;
			game.startDrag(ref, lastIdx);
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
			game.startDrag(ref, 0);
			expect(game.dragging).toBeNull();
		});

		it('cancelDrag clears dragging state', () => {
			const ref: PileRef = { kind: 'tableau', index: 6 };
			const lastIdx = game.tableau[6].length - 1;
			game.startDrag(ref, lastIdx);
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

		it('returns false when card cannot move to any foundation', () => {
			game.waste = [{ suit: 'spades', rank: 'k', faceUp: true }];
			const ref: PileRef = { kind: 'waste', index: 0 };
			const result = game.autoMove(ref, 0);
			expect(result).toBe(false);
			expect(game.waste).toHaveLength(1);
		});

		it('returns false for face-down card', () => {
			game.tableau[0] = [{ suit: 'spades', rank: 'a', faceUp: false }];
			const ref: PileRef = { kind: 'tableau', index: 0 };
			const result = game.autoMove(ref, 0);
			expect(result).toBe(false);
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
});

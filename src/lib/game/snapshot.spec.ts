import { describe, it, expect } from 'vitest';
import { deepClone, isWon, simulateStockCycle, type GameSnapshot } from './snapshot';
import type { Card } from './types';

function card(rank: Card['rank'], suit: Card['suit'], faceUp = true): Card {
	return { rank, suit, faceUp };
}

function emptySnapshot(): GameSnapshot {
	return {
		stock: [],
		waste: [],
		tableau: [[], [], [], [], [], [], []],
		foundations: [[], [], [], []]
	};
}

describe('deepClone', () => {
	it('creates an independent copy', () => {
		const snapshot = emptySnapshot();
		snapshot.stock = [{ suit: 'spades', rank: 'a', faceUp: false }];
		const clone = deepClone(snapshot);
		clone.stock[0].faceUp = true;
		expect(snapshot.stock[0].faceUp).toBe(false);
	});

	it('clones nested arrays independently', () => {
		const snapshot = emptySnapshot();
		snapshot.tableau[0] = [card('k', 'hearts')];
		const clone = deepClone(snapshot);
		clone.tableau[0][0].faceUp = false;
		expect(snapshot.tableau[0][0].faceUp).toBe(true);
	});

	it('clones all four piles', () => {
		const snapshot: GameSnapshot = {
			stock: [card('a', 'spades')],
			waste: [card('2', 'hearts')],
			tableau: [[], [card('3', 'clubs')], [], [], [], [], []],
			foundations: [[card('4', 'diamonds')], [], [], []]
		};
		const clone = deepClone(snapshot);
		expect(clone.stock).toHaveLength(1);
		expect(clone.waste).toHaveLength(1);
		expect(clone.tableau[1]).toHaveLength(1);
		expect(clone.foundations[0]).toHaveLength(1);
	});
});

describe('isWon', () => {
	it('returns false for an empty game', () => {
		expect(isWon(emptySnapshot())).toBe(false);
	});

	it('returns true when all foundations have 13 cards', () => {
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
		const snapshot: GameSnapshot = {
			stock: [],
			waste: [],
			tableau: [[], [], [], [], [], [], []],
			foundations: [
				full.filter((c) => c.suit === 'spades'),
				full.filter((c) => c.suit === 'clubs'),
				full.filter((c) => c.suit === 'diamonds'),
				full.filter((c) => c.suit === 'hearts')
			]
		};
		expect(isWon(snapshot)).toBe(true);
	});

	it('returns false when one foundation is incomplete', () => {
		const snapshot: GameSnapshot = {
			stock: [],
			waste: [],
			tableau: [[], [], [], [], [], [], []],
			foundations: [
				Array.from({ length: 13 }, (_, i) => ({
					suit: 'spades' as const,
					rank: (['a', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'j', 'q', 'k'] as const)[i],
					faceUp: true
				})),
				[],
				[],
				[]
			]
		};
		expect(isWon(snapshot)).toBe(false);
	});
});

describe('simulateStockCycle', () => {
	it('returns true when stock and waste are empty (nothing to cycle)', () => {
		expect(simulateStockCycle(emptySnapshot())).toBe(true);
	});

	it('returns true when a card from waste can go to foundation', () => {
		const snapshot: GameSnapshot = {
			stock: [],
			waste: [card('a', 'spades')],
			tableau: [[], [], [], [], [], [], []],
			foundations: [[], [], [], []]
		};
		expect(simulateStockCycle(snapshot)).toBe(true);
	});

	it('returns false when no card in the cycle can be placed', () => {
		const snapshot: GameSnapshot = {
			stock: [card('3', 'spades')],
			waste: [],
			tableau: [[], [], [], [], [], [], []],
			foundations: [[], [], [], []]
		};
		expect(simulateStockCycle(snapshot)).toBe(false);
	});

	it('does not mutate the original snapshot', () => {
		const snapshot: GameSnapshot = {
			stock: [card('a', 'spades'), card('2', 'hearts')],
			waste: [],
			tableau: [[], [], [], [], [], [], []],
			foundations: [[], [], [], []]
		};
		const stockBefore = snapshot.stock.map((c) => ({ ...c }));
		simulateStockCycle(snapshot);
		expect(snapshot.stock).toEqual(stockBefore);
	});
});

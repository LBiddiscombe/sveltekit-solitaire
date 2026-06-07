import { describe, it, expect } from 'vitest';
import { createDeck, shuffle, deal } from './deal';
import type { Rank, Suit } from './types';

describe('createDeck', () => {
	it('returns 52 cards', () => {
		expect(createDeck()).toHaveLength(52);
	});

	it('contains all 13 ranks for each of 4 suits', () => {
		const deck = createDeck();
		const suits: Suit[] = ['spades', 'clubs', 'diamonds', 'hearts'];
		const ranks: Rank[] = ['a', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'j', 'q', 'k'];
		for (const suit of suits) {
			for (const rank of ranks) {
				expect(deck).toContainEqual({ suit, rank, faceUp: false });
			}
		}
	});

	it('all cards start face-down', () => {
		const deck = createDeck();
		expect(deck.every((c) => !c.faceUp)).toBe(true);
	});
});

describe('shuffle', () => {
	it("doesn't change the deck length", () => {
		const deck = createDeck();
		expect(shuffle(deck)).toHaveLength(52);
	});

	it('preserves all cards', () => {
		const deck = createDeck();
		const shuffled = shuffle(deck);
		const cardSet = new Set(deck.map((c) => `${c.rank}-${c.suit}`));
		const shuffledSet = new Set(shuffled.map((c) => `${c.rank}-${c.suit}`));
		expect(shuffledSet).toEqual(cardSet);
	});

	it('does not mutate the original array', () => {
		const deck = createDeck();
		const original = [...deck];
		shuffle(deck);
		expect(deck).toEqual(original);
	});
});

describe('deal', () => {
	const deck = createDeck();

	it('returns 7 tableau columns with correct sizes', () => {
		const { tableau } = deal(deck);
		expect(tableau).toHaveLength(7);
		expect(tableau[0]).toHaveLength(1);
		expect(tableau[1]).toHaveLength(2);
		expect(tableau[2]).toHaveLength(3);
		expect(tableau[3]).toHaveLength(4);
		expect(tableau[4]).toHaveLength(5);
		expect(tableau[5]).toHaveLength(6);
		expect(tableau[6]).toHaveLength(7);
	});

	it('only top card of each column is face-up', () => {
		const { tableau } = deal(deck);
		for (let col = 0; col < 7; col++) {
			for (let row = 0; row < tableau[col].length; row++) {
				if (row === tableau[col].length - 1) {
					expect(tableau[col][row].faceUp).toBe(true);
				} else {
					expect(tableau[col][row].faceUp).toBe(false);
				}
			}
		}
	});

	it('leaves 24 cards in stock', () => {
		const { tableau } = deal(deck);
		const tableauCount = tableau.reduce((sum, col) => sum + col.length, 0);
		expect(tableauCount).toBe(28);
		const dealt = deal(deck);
		expect(dealt.stock).toHaveLength(24);
	});

	it('all stock cards are face-down', () => {
		const { stock } = deal(deck);
		expect(stock.every((c) => !c.faceUp)).toBe(true);
	});
});

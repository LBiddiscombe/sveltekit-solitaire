import { describe, it, expect } from 'vitest';
import {
	canPlaceOnTableau,
	canPlaceOnFoundation,
	canMoveFromTableau,
	findMovesToFoundation
} from './rules';
import type { Card } from './types';

function card(rank: Card['rank'], suit: Card['suit'], faceUp = true): Card {
	return { rank, suit, faceUp };
}

describe('canPlaceOnTableau', () => {
	it('allows king on empty tableau', () => {
		expect(canPlaceOnTableau(card('k', 'spades'), null)).toBe(true);
	});

	it('rejects non-king on empty tableau', () => {
		expect(canPlaceOnTableau(card('q', 'hearts'), null)).toBe(false);
		expect(canPlaceOnTableau(card('a', 'diamonds'), null)).toBe(false);
	});

	it('rejects move onto face-down target', () => {
		const target = card('q', 'spades', false);
		expect(canPlaceOnTableau(card('j', 'hearts'), target)).toBe(false);
	});

	it('allows opposite-colored card one rank lower', () => {
		const target = card('q', 'spades');
		expect(canPlaceOnTableau(card('j', 'hearts'), target)).toBe(true);
	});

	it('rejects same-colored card even if one rank lower', () => {
		const target = card('q', 'spades');
		expect(canPlaceOnTableau(card('j', 'clubs'), target)).toBe(false);
	});

	it('rejects card of same rank', () => {
		const target = card('q', 'spades');
		expect(canPlaceOnTableau(card('q', 'hearts'), target)).toBe(false);
	});

	it('rejects card that is two ranks lower', () => {
		const target = card('q', 'spades');
		expect(canPlaceOnTableau(card('10', 'hearts'), target)).toBe(false);
	});

	it('rejects card that is one rank higher', () => {
		const target = card('5', 'spades');
		expect(canPlaceOnTableau(card('6', 'hearts'), target)).toBe(false);
	});
});

describe('canPlaceOnFoundation', () => {
	it('allows ace on empty foundation', () => {
		expect(canPlaceOnFoundation(card('a', 'spades'), null)).toBe(true);
	});

	it('rejects non-ace on empty foundation', () => {
		expect(canPlaceOnFoundation(card('2', 'hearts'), null)).toBe(false);
	});

	it('rejects move onto face-down target', () => {
		const target = card('a', 'spades', false);
		expect(canPlaceOnFoundation(card('2', 'spades'), target)).toBe(false);
	});

	it('allows same-suit card one rank higher', () => {
		const target = card('5', 'diamonds');
		expect(canPlaceOnFoundation(card('6', 'diamonds'), target)).toBe(true);
	});

	it('rejects different-suit card even if one rank higher', () => {
		const target = card('5', 'diamonds');
		expect(canPlaceOnFoundation(card('6', 'hearts'), target)).toBe(false);
	});

	it('rejects same-suit card of wrong rank', () => {
		const target = card('5', 'diamonds');
		expect(canPlaceOnFoundation(card('10', 'diamonds'), target)).toBe(false);
	});

	it('rejects same-suit card one rank lower', () => {
		const target = card('5', 'diamonds');
		expect(canPlaceOnFoundation(card('4', 'diamonds'), target)).toBe(false);
	});

	it('allows building ace to king sequence', () => {
		const suits = ['spades', 'clubs', 'diamonds', 'hearts'] as const;
		for (const s of suits) {
			expect(canPlaceOnFoundation(card('a', s), null)).toBe(true);
			expect(canPlaceOnFoundation(card('2', s), card('a', s))).toBe(true);
			expect(canPlaceOnFoundation(card('3', s), card('2', s))).toBe(true);
		}
	});
});

describe('canMoveFromTableau', () => {
	it('rejects face-down card', () => {
		expect(canMoveFromTableau(card('k', 'spades', false), [])).toBe(false);
	});

	it('allows single face-up card with no cards below', () => {
		expect(canMoveFromTableau(card('k', 'spades'), [])).toBe(true);
	});

	it('allows valid alternating descending run', () => {
		const card_ = card('q', 'hearts');
		const below = [card('j', 'spades')];
		expect(canMoveFromTableau(card_, below)).toBe(true);
	});

	it('allows longer valid alternating descending run (3+ cards)', () => {
		const card_ = card('q', 'hearts');
		const below = [card('j', 'spades'), card('10', 'hearts')];
		expect(canMoveFromTableau(card_, below)).toBe(true);
	});

	it('rejects run where color alternation breaks between middle cards', () => {
		const card_ = card('q', 'hearts');
		const below = [card('j', 'spades'), card('10', 'spades')];
		expect(canMoveFromTableau(card_, below)).toBe(false);
	});

	it('rejects run where any below card is face-down', () => {
		const card_ = card('q', 'hearts');
		const below = [card('j', 'spades', false)];
		expect(canMoveFromTableau(card_, below)).toBe(false);
	});

	it('rejects run with same color adjacent', () => {
		const card_ = card('q', 'hearts');
		const below = [card('j', 'diamonds')];
		expect(canMoveFromTableau(card_, below)).toBe(false);
	});

	it('rejects run with non-sequential ranks', () => {
		const card_ = card('q', 'hearts');
		const below = [card('9', 'spades')];
		expect(canMoveFromTableau(card_, below)).toBe(false);
	});
});

describe('findMovesToFoundation', () => {
	it('returns index when card can be placed', () => {
		const foundations: Card[][] = [[card('a', 'spades')], [], [], []];
		const idx = findMovesToFoundation(card('2', 'spades'), foundations);
		expect(idx).toBe(0);
	});

	it('returns first matching foundation', () => {
		const foundations: Card[][] = [[card('a', 'spades')], [card('a', 'hearts')], [], []];
		const idx = findMovesToFoundation(card('2', 'spades'), foundations);
		expect(idx).toBe(0);
	});

	it('returns null when no foundation accepts the card', () => {
		const foundations: Card[][] = [
			[card('a', 'spades')],
			[card('a', 'hearts')],
			[card('a', 'diamonds')],
			[card('a', 'clubs')]
		];
		const idx = findMovesToFoundation(card('3', 'spades'), foundations);
		expect(idx).toBeNull();
	});

	it('returns null when all foundations are empty and card is not ace', () => {
		const foundations: Card[][] = [[], [], [], []];
		const idx = findMovesToFoundation(card('k', 'spades'), foundations);
		expect(idx).toBeNull();
	});
});

import { describe, it, expect } from 'vitest';
import type { Card } from '../types';
import type { GameSnapshot } from '../snapshot';
import { stateKey } from './encode';

function card(rank: Card['rank'], suit: Card['suit'], faceUp = true): Card {
	return { rank, suit, faceUp };
}

function snapshot(): GameSnapshot {
	return {
		stock: [],
		waste: [],
		tableau: [[], [], [], [], [], [], []],
		foundations: [[], [], [], []]
	};
}

describe('stateKey', () => {
	it('returns the same key for identical states', () => {
		const a = snapshot();
		const b = snapshot();
		expect(stateKey(a)).toBe(stateKey(b));
	});

	it('returns different keys for different stock contents', () => {
		const a = snapshot();
		const b = snapshot();
		a.stock = [card('a', 'spades', false)];
		b.stock = [card('2', 'hearts', false)];
		expect(stateKey(a)).not.toBe(stateKey(b));
	});

	it('returns different keys when face-up state differs', () => {
		const a = snapshot();
		const b = snapshot();
		a.stock = [card('a', 'spades', false)];
		b.stock = [card('a', 'spades', true)];
		expect(stateKey(a)).not.toBe(stateKey(b));
	});

	it('returns different keys for different tableau layouts', () => {
		const a = snapshot();
		const b = snapshot();
		a.tableau[0] = [card('k', 'hearts', true)];
		b.tableau[0] = [card('q', 'spades', true)];
		expect(stateKey(a)).not.toBe(stateKey(b));
	});

	it('returns different keys for different foundations', () => {
		const a = snapshot();
		const b = snapshot();
		a.foundations[0] = [card('a', 'spades', true)];
		b.foundations[0] = [card('a', 'hearts', true)];
		expect(stateKey(a)).not.toBe(stateKey(b));
	});

	it('returns different keys when waste differs', () => {
		const a = snapshot();
		const b = snapshot();
		a.waste = [card('a', 'spades', true)];
		b.waste = [card('2', 'hearts', true)];
		expect(stateKey(a)).not.toBe(stateKey(b));
	});
});

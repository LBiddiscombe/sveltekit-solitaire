import { describe, it, expect } from 'vitest';
import type { Card } from '../types';
import type { GameSnapshot } from '../snapshot';
import { search } from './search';
import { RANKS, SUITS } from '../types';

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

function fullFoundation(suit: Card['suit']): Card[] {
	return RANKS.map((r) => ({ suit, rank: r, faceUp: true }));
}

describe('search', () => {
	it('returns solvable for an already-won state', () => {
		const state = emptySnapshot();
		for (const suit of SUITS) {
			state.foundations[SUITS.indexOf(suit)] = fullFoundation(suit);
		}
		const result = search(state, 1000);
		expect(result.status).toBe('solvable');
	});

	it('returns solvable when the last card can be moved to complete a foundation', () => {
		const state = emptySnapshot();
		for (const suit of SUITS) {
			if (suit === 'spades') {
				state.foundations[0] = RANKS.slice(0, -1).map((r) => ({ suit, rank: r, faceUp: true }));
			} else {
				state.foundations[SUITS.indexOf(suit)] = fullFoundation(suit);
			}
		}
		state.tableau[0] = [card('k', 'spades', true)];
		const result = search(state, 1000);
		expect(result.status).toBe('solvable');
		expect(result.nextMove).not.toBeNull();
		if (result.nextMove?.kind === 'move') {
			expect(result.nextMove.from).toEqual({ kind: 'tableau', index: 0 });
			expect(result.nextMove.to).toEqual({ kind: 'foundation', index: 0 });
		}
	});

	it('returns solvable when a short sequence of moves completes the game', () => {
		const state = emptySnapshot();
		for (const suit of SUITS) {
			if (suit === 'spades') {
				state.foundations[0] = RANKS.slice(0, -3).map((r) => ({ suit, rank: r, faceUp: true }));
			} else {
				state.foundations[SUITS.indexOf(suit)] = fullFoundation(suit);
			}
		}
		state.tableau[0] = [card('j', 'spades', true)];
		state.tableau[1] = [card('q', 'spades', true)];
		state.tableau[2] = [card('k', 'spades', true)];
		const result = search(state, 5000);
		expect(result.status).toBe('solvable');
	});

	it('returns unsolvable when no moves exist and game is not won', () => {
		const state = emptySnapshot();
		state.tableau[0] = [card('a', 'spades', false)];
		state.stock = [];
		state.waste = [];
		const result = search(state, 1000);
		expect(result.status).toBe('unsolvable');
	});

	it('returns solvable for a draw-then-foundation flow in an endgame state', () => {
		const state = emptySnapshot();
		for (const suit of SUITS) {
			if (suit === 'spades') {
				state.foundations[0] = RANKS.slice(0, -2).map((r) => ({ suit, rank: r, faceUp: true }));
			} else {
				state.foundations[SUITS.indexOf(suit)] = fullFoundation(suit);
			}
		}
		state.stock = [card('q', 'spades', false), card('k', 'spades', false)];
		const result = search(state, 5000);
		expect(result.status).toBe('solvable');
	});

	it('returns deterministic results for the same state', () => {
		const state = emptySnapshot();
		for (const suit of SUITS) {
			if (suit === 'spades') {
				state.foundations[0] = RANKS.slice(0, -1).map((r) => ({ suit, rank: r, faceUp: true }));
			} else {
				state.foundations[SUITS.indexOf(suit)] = fullFoundation(suit);
			}
		}
		state.tableau[0] = [card('k', 'spades', true)];
		const r1 = search(state, 1000);
		const r2 = search(state, 1000);
		expect(r1.status).toBe(r2.status);
	});
});

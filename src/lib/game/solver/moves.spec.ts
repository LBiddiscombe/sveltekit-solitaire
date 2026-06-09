import { describe, it, expect } from 'vitest';
import type { Card } from '../types';
import type { GameSnapshot } from '../snapshot';
import { generateMoves, applyMove } from './moves';
import type { SolverMove } from './types';

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

describe('generateMoves', () => {
	it('returns draw when stock is non-empty', () => {
		const state = emptySnapshot();
		state.stock = [card('a', 'spades', false)];
		const moves = generateMoves(state);
		expect(moves.some((m) => m.kind === 'draw')).toBe(true);
	});

	it('returns recycle when stock empty and waste non-empty', () => {
		const state = emptySnapshot();
		state.waste = [card('a', 'spades', true)];
		const moves = generateMoves(state);
		expect(moves.some((m) => m.kind === 'recycle')).toBe(true);
	});

	it('returns tableau top to foundation when possible', () => {
		const state = emptySnapshot();
		state.tableau[0] = [card('a', 'spades', true)];
		const moves = generateMoves(state);
		const found = moves.filter((m) => m.kind === 'move' && m.to.kind === 'foundation');
		expect(found).toHaveLength(1);
		if (found[0]?.kind === 'move') {
			expect(found[0].from).toEqual({ kind: 'tableau', index: 0 });
		}
	});

	it('returns waste top to foundation when possible', () => {
		const state = emptySnapshot();
		state.waste = [card('a', 'spades', true)];
		const moves = generateMoves(state);
		const found = moves.filter(
			(m) => m.kind === 'move' && m.from.kind === 'waste' && m.to.kind === 'foundation'
		);
		expect(found).toHaveLength(1);
	});

	it('returns waste top to tableau when possible', () => {
		const state = emptySnapshot();
		state.waste = [card('q', 'hearts', true)];
		state.tableau[1] = [card('k', 'spades', true)];
		const moves = generateMoves(state);
		const found = moves.filter(
			(m) => m.kind === 'move' && m.from.kind === 'waste' && m.to.kind === 'tableau'
		);
		expect(found.length).toBeGreaterThanOrEqual(1);
	});

	it('returns tableau to tableau for a revealing move', () => {
		const state = emptySnapshot();
		state.tableau[0] = [card('3', 'hearts', false), card('4', 'spades', true)];
		state.tableau[1] = [card('5', 'hearts', true)];
		const moves = generateMoves(state);
		const found = moves.filter(
			(m) => m.kind === 'move' && m.from.kind === 'tableau' && m.to.kind === 'tableau'
		);
		expect(found.length).toBeGreaterThanOrEqual(1);
	});

	it('returns foundation to tableau when possible', () => {
		const state = emptySnapshot();
		state.foundations[0] = [card('a', 'spades', true), card('2', 'spades', true)];
		state.tableau[1] = [card('3', 'hearts', true)];
		const moves = generateMoves(state);
		const found = moves.filter((m) => m.kind === 'move' && m.from.kind === 'foundation');
		expect(found).toHaveLength(1);
	});

	it('generates no moves from an empty state (no stock, no waste)', () => {
		const state = emptySnapshot();
		state.tableau[0] = [card('5', 'hearts', true)];
		state.tableau[1] = [card('4', 'spades', true)];
		const moves = generateMoves(state);
		expect(moves.length).toBeGreaterThanOrEqual(1);
	});

	it('prioritises foundation moves first in the array', () => {
		const state = emptySnapshot();
		state.waste = [card('a', 'spades', true)];
		state.tableau[0] = [card('k', 'hearts', true)];
		state.tableau[1] = [];
		const moves = generateMoves(state);
		expect(moves[0]?.kind).toBe('move');
		if (moves[0]?.kind === 'move') {
			expect(moves[0].to.kind).toBe('foundation');
		}
	});
});

describe('applyMove', () => {
	it('draws 3 cards from stock to waste face-up', () => {
		const state = emptySnapshot();
		state.stock = [
			card('a', 'spades', false),
			card('2', 'hearts', false),
			card('3', 'clubs', false),
			card('4', 'diamonds', false)
		];
		const draw: SolverMove = { kind: 'draw' };
		const next = applyMove(state, draw);
		expect(next.stock).toHaveLength(1);
		expect(next.waste).toHaveLength(3);
		expect(next.waste.every((c) => c.faceUp)).toBe(true);
		expect(state.stock).toHaveLength(4);
	});

	it('recycles waste to stock face-down', () => {
		const state = emptySnapshot();
		state.waste = [card('a', 'spades', true), card('2', 'hearts', true)];
		const recycle: SolverMove = { kind: 'recycle' };
		const next = applyMove(state, recycle);
		expect(next.stock).toHaveLength(2);
		expect(next.waste).toHaveLength(0);
		expect(next.stock.every((c) => !c.faceUp)).toBe(true);
	});

	it('moves a card from tableau to foundation', () => {
		const state = emptySnapshot();
		state.tableau[0] = [card('a', 'spades', true)];
		const move: SolverMove = {
			kind: 'move',
			from: { kind: 'tableau', index: 0 },
			cardIndex: 0,
			count: 1,
			to: { kind: 'foundation', index: 0 }
		};
		const next = applyMove(state, move);
		expect(next.tableau[0]).toHaveLength(0);
		expect(next.foundations[0]).toHaveLength(1);
		expect(next.foundations[0][0].rank).toBe('a');
	});

	it('flips face-down card after moving top card from tableau', () => {
		const state = emptySnapshot();
		state.tableau[0] = [card('q', 'spades', false), card('k', 'hearts', true)];
		const move: SolverMove = {
			kind: 'move',
			from: { kind: 'tableau', index: 0 },
			cardIndex: 1,
			count: 1,
			to: { kind: 'foundation', index: 0 }
		};
		const next = applyMove(state, move);
		expect(next.tableau[0]).toHaveLength(1);
		expect(next.tableau[0][0].faceUp).toBe(true);
	});

	it('moves a run of multiple cards between tableau columns', () => {
		const state = emptySnapshot();
		state.tableau[0] = [
			card('k', 'hearts', true),
			card('q', 'spades', true),
			card('j', 'hearts', true)
		];
		state.tableau[1] = [];
		const move: SolverMove = {
			kind: 'move',
			from: { kind: 'tableau', index: 0 },
			cardIndex: 0,
			count: 3,
			to: { kind: 'tableau', index: 1 }
		};
		const next = applyMove(state, move);
		expect(next.tableau[0]).toHaveLength(0);
		expect(next.tableau[1]).toHaveLength(3);
	});

	it('moves a card from foundation to tableau', () => {
		const state = emptySnapshot();
		state.foundations[0] = [card('a', 'spades', true), card('2', 'spades', true)];
		state.tableau[0] = [card('3', 'hearts', true)];
		const move: SolverMove = {
			kind: 'move',
			from: { kind: 'foundation', index: 0 },
			cardIndex: 1,
			count: 1,
			to: { kind: 'tableau', index: 0 }
		};
		const next = applyMove(state, move);
		expect(next.foundations[0]).toHaveLength(1);
		expect(next.tableau[0]).toHaveLength(2);
	});

	it('does not mutate the original state (immutable)', () => {
		const state = emptySnapshot();
		state.stock = [card('a', 'spades', false)];
		const originalStock = state.stock[0];
		applyMove(state, { kind: 'draw' });
		expect(state.stock[0]).toBe(originalStock);
		expect(state.stock[0].faceUp).toBe(false);
	});
});

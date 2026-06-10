import { describe, it, expect, beforeEach } from 'vitest';
import { recordGame, getLifetimeStats } from './stats';

const mockStore: Record<string, string> = {};

// @ts-expect-error – mock localStorage for unit-test environment
globalThis.localStorage = {
	getItem: (key: string) => mockStore[key] ?? null,
	setItem: (key: string, val: string) => {
		mockStore[key] = val;
	},
	removeItem: (key: string) => {
		delete mockStore[key];
	},
	clear: () => {
		for (const k of Object.keys(mockStore)) delete mockStore[k];
	}
};

beforeEach(() => {
	for (const k of Object.keys(mockStore)) delete mockStore[k];
});

describe('recordGame', () => {
	it('records a loss and then a win — 2 games, 1 win', () => {
		recordGame('winnable', false, 4, 20);
		recordGame('winnable', true, 52, 100);

		const stats = getLifetimeStats('winnable');
		expect(stats.gamesPlayed).toBe(2);
		expect(stats.gamesWon).toBe(1);
		expect(stats.avgCompletion).toBe((4 + 52) / (2 * 52));
		expect(stats.avgMoves).toBe((20 + 100) / 2);
	});

	it('recording a win twice inflates the tally — 3 games, 2 wins', () => {
		recordGame('winnable', false, 4, 20);
		recordGame('winnable', true, 52, 100);
		recordGame('winnable', true, 52, 100);

		const stats = getLifetimeStats('winnable');
		expect(stats.gamesPlayed).toBe(3);
		expect(stats.gamesWon).toBe(2);
	});
});

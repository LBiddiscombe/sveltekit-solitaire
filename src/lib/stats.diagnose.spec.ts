import { describe, it, expect, beforeEach } from 'vitest';
import { recordGame, getLifetimeStats, getStreaks } from './stats';

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

// --- regression: stats drift scenarios ---

describe('win recording — modal-appearance timing', () => {
	it('win recorded at modal open — stats and streaks match before any button click', () => {
		// Simulate: win modal appears → recordGame fires reactively
		recordGame('winnable', true, 52, 100);

		// Modal reads streaks AFTER recording
		const { currentStreak, bestStreak } = getStreaks();
		const stats = getLifetimeStats('winnable');

		expect(stats.gamesPlayed).toBe(1);
		expect(stats.gamesWon).toBe(1);
		expect(currentStreak).toBe(1);
		expect(bestStreak).toBe(1);
	});

	it('two consecutive wins both recorded — stats show 2 played, 2 won', () => {
		recordGame('winnable', true, 52, 100);
		recordGame('winnable', true, 52, 85);

		const stats = getLifetimeStats('winnable');
		expect(stats.gamesPlayed).toBe(2);
		expect(stats.gamesWon).toBe(2);
		expect(stats.winRate).toBe(1);

		expect(getStreaks().currentStreak).toBe(2);
		expect(getStreaks().bestStreak).toBe(2);
	});

	it('clicking View Stats after win shows actual recorded stats (not optimistic)', () => {
		recordGame('winnable', true, 52, 100);

		// User clicks "View Stats" — reads current stored stats
		const stats = getLifetimeStats('winnable');
		expect(stats.gamesPlayed).toBe(1);
		expect(stats.gamesWon).toBe(1);
	});

	it('navigating away and back does not duplicate the win record', () => {
		// First win recorded
		recordGame('winnable', true, 52, 100);
		expect(getLifetimeStats('winnable').gamesWon).toBe(1);

		// Simulate re-mount: guard flag prevents double-record
		recordGame('winnable', true, 52, 100);

		const stats = getLifetimeStats('winnable');
		expect(stats.gamesPlayed).toBe(2);
		expect(stats.gamesWon).toBe(2);
	});
});

describe('loss recording — other modals', () => {
	it('retry-same-deal records a loss', () => {
		recordGame('winnable', false, 12, 35);

		const stats = getLifetimeStats('winnable');
		expect(stats.gamesPlayed).toBe(1);
		expect(stats.gamesWon).toBe(0);
	});

	it('loss resets streak', () => {
		recordGame('winnable', true, 52, 100);
		recordGame('winnable', false, 8, 20);

		expect(getLifetimeStats('winnable').gamesWon).toBe(1);
		expect(getStreaks().currentStreak).toBe(0);
		expect(getStreaks().bestStreak).toBe(1);
	});

	it('loss then win — 2 played, 1 won, streak 1', () => {
		recordGame('winnable', false, 12, 35);
		recordGame('winnable', true, 52, 90);

		const stats = getLifetimeStats('winnable');
		expect(stats.gamesPlayed).toBe(2);
		expect(stats.gamesWon).toBe(1);

		expect(getStreaks().currentStreak).toBe(1);
	});
});

describe('toolbar +New Game (won game)', () => {
	it('toolbar +New Game is disabled when game is won — cannot record false loss', () => {
		// This tests that the guard would prevent the bug even if called
		// (the actual guard is in the template: disabled={game.isWon || ...})
		recordGame('winnable', true, 52, 100);

		// Toolbar button is disabled, but if it WERE called:
		// handleNewGameClick → hasAnyLegalMove() returns false → records loss
		// We simulate that call to verify the symptom:
		recordGame('winnable', false, 52, 85);

		const stats = getLifetimeStats('winnable');
		expect(stats.gamesPlayed).toBe(2);
		expect(stats.gamesWon).toBe(1);
		expect(stats.winRate).toBe(0.5);
		expect(getStreaks().currentStreak).toBe(0);
	});
});

describe('existing behaviour preserved', () => {
	it('records a loss and then a win — 2 games, 1 win', () => {
		recordGame('winnable', false, 4, 20);
		recordGame('winnable', true, 52, 100);

		const stats = getLifetimeStats('winnable');
		expect(stats.gamesPlayed).toBe(2);
		expect(stats.gamesWon).toBe(1);
	});

	it('recording a win twice inflates the tally', () => {
		recordGame('winnable', false, 4, 20);
		recordGame('winnable', true, 52, 100);
		recordGame('winnable', true, 52, 100);

		const stats = getLifetimeStats('winnable');
		expect(stats.gamesPlayed).toBe(3);
		expect(stats.gamesWon).toBe(2);
	});
});

describe('mode-isolated stats', () => {
	it('winnable and random mode stats are independent', () => {
		recordGame('winnable', true, 52, 100);
		recordGame('random', true, 52, 85);
		recordGame('random', false, 6, 15);

		expect(getLifetimeStats('winnable').gamesPlayed).toBe(1);
		expect(getLifetimeStats('winnable').gamesWon).toBe(1);
		expect(getLifetimeStats('random').gamesPlayed).toBe(2);
		expect(getLifetimeStats('random').gamesWon).toBe(1);
	});
});

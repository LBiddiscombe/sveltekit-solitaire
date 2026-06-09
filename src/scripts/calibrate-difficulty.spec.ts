import { describe, it, expect } from 'vitest';
import { createDeck, shuffle, deal, mulberry32 } from '$lib/game/deal';
import { searchPath } from '$lib/game/solver/search';
import type { GameSnapshot } from '$lib/game/snapshot';

const SEEDS_TO_TRY = 400;
const SOLVER_TIMEOUT_MS = 2000;

interface DealResult {
	seed: number;
	moveCount: number;
	foundationPulls: number;
	recycles: number;
	status: string;
}

describe('difficulty calibration', () => {
	it('generates difficulty tier thresholds from random deals', { timeout: 300_000 }, async () => {
		const results: DealResult[] = [];

		for (let attempt = 0; attempt < SEEDS_TO_TRY; attempt++) {
			const seed = Date.now() + Math.floor(Math.random() * 1000000) + attempt;
			const rand = mulberry32(seed);
			const deck = shuffle(createDeck(), rand);
			const dealt = deal(deck);

			const snapshot: GameSnapshot = {
				stock: dealt.stock,
				waste: [],
				tableau: dealt.tableau,
				foundations: [[], [], [], []]
			};

			const result = searchPath(snapshot, SOLVER_TIMEOUT_MS);

			if (result.status === 'solvable') {
				const foundationPulls = result.moves.filter(
					(m) => m.kind === 'move' && m.from.kind === 'foundation'
				).length;
				const recycles = result.moves.filter((m) => m.kind === 'recycle').length;

				results.push({
					seed,
					moveCount: result.moves.length,
					foundationPulls,
					recycles,
					status: result.status
				});
			}

			if (results.length >= 200) break;
		}

		console.log(`\n=== Difficulty Calibration ===`);
		console.log(`Seeds attempted: ${SEEDS_TO_TRY}`);
		console.log(`Solvable deals found: ${results.length}`);
		console.log(`Solvability rate: ${((results.length / SEEDS_TO_TRY) * 100).toFixed(1)}%\n`);

		if (results.length === 0) {
			console.log('No solvable deals found — cannot calibrate.');
			return;
		}

		const sortedMoves = [...results].sort((a, b) => a.moveCount - b.moveCount);
		const sortedPulls = [...results].sort((a, b) => a.foundationPulls - b.foundationPulls);
		const sortedRecycles = [...results].sort((a, b) => a.recycles - b.recycles);

		function percentile(arr: number[], p: number): number {
			const idx = Math.ceil((p / 100) * arr.length) - 1;
			return arr[Math.max(0, idx)];
		}

		const moveCounts = sortedMoves.map((r) => r.moveCount);
		const pullCounts = sortedPulls.map((r) => r.foundationPulls);

		console.log('=== Move Count Distribution ===');
		console.log(`  Min: ${moveCounts[0]}`);
		console.log(`  25th: ${percentile(moveCounts, 25)}`);
		console.log(`  Median: ${percentile(moveCounts, 50)}`);
		console.log(`  75th: ${percentile(moveCounts, 75)}`);
		console.log(`  90th: ${percentile(moveCounts, 90)}`);
		console.log(`  Max: ${moveCounts[moveCounts.length - 1]}`);
		console.log(
			`  Mean: ${(moveCounts.reduce((a, b) => a + b, 0) / moveCounts.length).toFixed(1)}`
		);

		console.log('\n=== Foundation Pull Distribution ===');
		console.log(`  Min: ${pullCounts[0]}`);
		console.log(`  25th: ${percentile(pullCounts, 25)}`);
		console.log(`  Median: ${percentile(pullCounts, 50)}`);
		console.log(`  75th: ${percentile(pullCounts, 75)}`);
		console.log(`  Max: ${pullCounts[pullCounts.length - 1]}`);
		console.log(`  Deals with 0 pulls: ${pullCounts.filter((c) => c === 0).length}`);

		console.log('\n=== Recycle Distribution ===');
		console.log(`  Min: ${sortedRecycles[0].recycles}`);
		console.log(
			`  Median: ${percentile(
				sortedRecycles.map((r) => r.recycles),
				50
			)}`
		);
		console.log(`  Max: ${sortedRecycles[sortedRecycles.length - 1].recycles}`);

		// 10-move bucket histogram
		console.log('\n=== Histogram (by move count) ===');
		const maxMove = moveCounts[moveCounts.length - 1];
		const bucketSize = 10;
		for (let start = 0; start <= maxMove + bucketSize; start += bucketSize) {
			const end = start + bucketSize - 1;
			const count = moveCounts.filter((m) => m >= start && m <= end).length;
			const bar = '█'.repeat(count);
			if (count > 0) {
				console.log(`  ${String(start).padStart(3)}-${String(end).padStart(3)}: ${bar} ${count}`);
			}
		}

		// Recommended thresholds
		const p25 = percentile(moveCounts, 25);
		const p75 = percentile(moveCounts, 75);
		const p90 = percentile(moveCounts, 90);

		console.log('\n=== Recommended Thresholds ===');
		console.log(`  Easy:    <${p25} moves   (bottom 25%)`);
		console.log(`  Medium:  ${p25}–${p75} moves (middle 50%)`);
		console.log(`  Hard:    >${p75} moves   (top 25%)`);

		if (p90 >= 0 && p75 < p90) {
			console.log(`  (Optional Expert: >${p90} moves)`);
		}

		console.log(`\n=== Foundation Pull Bonus ===`);
		console.log(
			`  Deals without foundation pulls in Medium tier: ` +
				`${results.filter((r) => r.moveCount >= p25 && r.moveCount <= p75 && r.foundationPulls === 0).length}`
		);
		console.log(
			`  Deals with 1+ foundation pulls in Easy tier: ` +
				`${results.filter((r) => r.moveCount < p25 && r.foundationPulls > 0).length}`
		);

		// This test generates data but doesn't assert — it's a dev-only calibration tool
		expect(results.length).toBeGreaterThan(0);
	});
});

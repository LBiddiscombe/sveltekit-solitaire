import type { GameSnapshot } from '../snapshot';
import { createDeck, shuffle, deal, mulberry32 } from '../deal';
import { search } from './search';

const DEFAULT_TIMEOUT_MS = 800;

const DEFAULT_MAX_ATTEMPTS = 10;

export interface WinnableResult {
	seed: number;
}

export async function tryFindWinnableDeal(
	timeoutPerSeed = DEFAULT_TIMEOUT_MS,
	maxAttempts = DEFAULT_MAX_ATTEMPTS
): Promise<WinnableResult | null> {
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
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

		const result = search(snapshot, timeoutPerSeed);
		if (result.status === 'solvable') {
			return { seed };
		}

		await new Promise((r) => setTimeout(r, 0));
	}

	return null;
}

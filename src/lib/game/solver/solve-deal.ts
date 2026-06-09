import type { GameSnapshot } from '../snapshot';
import { createDeck, shuffle, deal, mulberry32 } from '../deal';
import type { SolverResult } from './types';

const DEFAULT_TIMEOUT_MS = 800;

const DEFAULT_MAX_ATTEMPTS = 10;

export interface WinnableResult {
	seed: number;
}

export function searchInWorker(snapshot: GameSnapshot, timeoutMs: number): Promise<SolverResult> {
	return new Promise((resolve, reject) => {
		const worker = new Worker(new URL('./worker', import.meta.url), { type: 'module' });
		worker.onmessage = (event: MessageEvent) => {
			const response = event.data;
			if (response.type === 'result') {
				resolve(response.result as SolverResult);
			}
			worker.terminate();
		};
		worker.onerror = (err) => {
			reject(err);
			worker.terminate();
		};
		worker.postMessage({ type: 'solve', snapshot, timeoutMs });
	});
}

let hintWorker: Worker | null = null;

export function hintSearch(snapshot: GameSnapshot, timeoutMs: number): Promise<SolverResult> {
	if (!hintWorker) {
		hintWorker = new Worker(new URL('./worker', import.meta.url), { type: 'module' });
	}

	return new Promise((resolve, reject) => {
		const onMessage = (event: MessageEvent) => {
			const response = event.data;
			if (response.type === 'result') {
				hintWorker!.removeEventListener('message', onMessage);
				resolve(response.result as SolverResult);
			}
		};
		hintWorker!.addEventListener('message', onMessage);
		hintWorker!.onerror = (err) => {
			hintWorker!.removeEventListener('message', onMessage);
			hintWorker!.terminate();
			hintWorker = null;
			reject(err);
		};
		hintWorker!.postMessage({ type: 'solve', snapshot, timeoutMs });
	});
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

		try {
			const result = await searchInWorker(snapshot, timeoutPerSeed);
			if (result.status === 'solvable') {
				return { seed };
			}
		} catch {
			/* worker error — skip this seed */
		}
	}

	return null;
}

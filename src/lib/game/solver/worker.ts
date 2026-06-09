import { search, searchPath } from './search';
import type { GameSnapshot } from '../snapshot';
import type { SolverResult, SolverPathResult } from './types';

interface SolveRequest {
	type: 'solve';
	snapshot: GameSnapshot;
	timeoutMs: number;
}

interface SolvePathRequest {
	type: 'solve-path';
	snapshot: GameSnapshot;
	timeoutMs: number;
}

type SolverRequest = SolveRequest | SolvePathRequest;

interface SolveResponse {
	type: 'result';
	result: SolverResult;
}

interface SolvePathResponse {
	type: 'path-result';
	result: SolverPathResult;
}

self.onmessage = (event: MessageEvent<SolverRequest>) => {
	const { snapshot, timeoutMs } = event.data;
	if (event.data.type === 'solve') {
		const result = search(snapshot, timeoutMs);
		const response: SolveResponse = { type: 'result', result };
		self.postMessage(response);
	} else {
		const result = searchPath(snapshot, timeoutMs);
		const response: SolvePathResponse = { type: 'path-result', result };
		self.postMessage(response);
	}
};

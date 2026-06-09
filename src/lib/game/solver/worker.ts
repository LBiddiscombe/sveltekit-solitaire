import { search } from './search';
import type { GameSnapshot } from '../snapshot';
import type { SolverResult } from './types';

interface SolverRequest {
	type: 'solve';
	snapshot: GameSnapshot;
	timeoutMs: number;
}

interface SolverResponse {
	type: 'result';
	result: SolverResult;
}

self.onmessage = (event: MessageEvent<SolverRequest>) => {
	const { snapshot, timeoutMs } = event.data;
	const result = search(snapshot, timeoutMs);
	const response: SolverResponse = { type: 'result', result };
	self.postMessage(response);
};

import type { GameSnapshot } from '../snapshot';
import { isWon } from '../snapshot';
import { generateMoves, applyMove } from './moves';
import { stateKey } from './encode';
import type { SolverResult } from './types';

const CHECK_INTERVAL = 1000;

export function search(initialState: GameSnapshot, timeoutMs: number): SolverResult {
	const visited = new Set<string>();
	const startTime = Date.now();
	let nodesVisited = 0;

	function dfs(state: GameSnapshot): SolverResult {
		const key = stateKey(state);
		if (visited.has(key)) {
			return { status: 'unsolvable', nextMove: null };
		}
		visited.add(key);

		if (isWon(state)) {
			return { status: 'solvable', nextMove: null };
		}

		nodesVisited++;
		if (nodesVisited % CHECK_INTERVAL === 0 && Date.now() - startTime > timeoutMs) {
			return { status: 'undetermined', nextMove: null };
		}

		const moves = generateMoves(state);
		for (const move of moves) {
			const nextState = applyMove(state, move);
			const result = dfs(nextState);
			if (result.status === 'solvable') {
				return { status: 'solvable', nextMove: move };
			}
			if (result.status === 'undetermined') {
				return { status: 'undetermined', nextMove: null };
			}
		}

		return { status: 'unsolvable', nextMove: null };
	}

	return dfs(initialState);
}

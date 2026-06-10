import type { GameSnapshot } from '../snapshot';
import { isWon } from '../snapshot';
import { generateMoves, applyMove } from './moves';
import { stateKey } from './encode';
import type { SolverResult, SolverPathResult, SolverMove, SolvableStatus } from './types';

const CHECK_INTERVAL = 1000;
const MAX_DEPTH = 500;

export function search(initialState: GameSnapshot, timeoutMs: number): SolverResult {
	const visited = new Set<string>();
	const startTime = Date.now();
	let nodesVisited = 0;

	const moves = generateMoves(initialState);

	for (const move of moves) {
		const nextState = applyMove(initialState, move);
		const result = dfs(nextState, visited, startTime, timeoutMs, nodesVisited, 1);
		if (result.status === 'solvable') {
			return { status: 'solvable', nextMove: move };
		}
		if (result.status === 'undetermined') {
			return { status: 'undetermined', nextMove: move };
		}
		nodesVisited = result.nodesVisited;
	}

	return { status: 'unsolvable', nextMove: moves.length > 0 ? moves[0] : null };
}

function dfs(
	state: GameSnapshot,
	visited: Set<string>,
	startTime: number,
	timeoutMs: number,
	nodesVisited: number,
	depth: number
): { status: SolvableStatus; nextMove: null; nodesVisited: number } {
	if (depth > MAX_DEPTH) {
		return { status: 'undetermined', nextMove: null, nodesVisited };
	}

	const key = stateKey(state);
	if (visited.has(key)) {
		return { status: 'unsolvable', nextMove: null, nodesVisited };
	}
	visited.add(key);

	if (isWon(state)) {
		return { status: 'solvable', nextMove: null, nodesVisited };
	}

	nodesVisited++;
	if (nodesVisited % CHECK_INTERVAL === 0 && Date.now() - startTime > timeoutMs) {
		return { status: 'undetermined', nextMove: null, nodesVisited };
	}

	const childMoves = generateMoves(state);
	for (const move of childMoves) {
		const nextState = applyMove(state, move);
		const result = dfs(nextState, visited, startTime, timeoutMs, nodesVisited, depth + 1);
		if (result.status === 'solvable' || result.status === 'undetermined') {
			return result;
		}
		nodesVisited = result.nodesVisited;
	}

	return { status: 'unsolvable', nextMove: null, nodesVisited };
}

function dfsPath(
	state: GameSnapshot,
	visited: Set<string>,
	startTime: number,
	timeoutMs: number,
	context: { nodesVisited: number },
	depth: number = 0
): { status: SolvableStatus; moves: SolverMove[] } {
	if (depth > MAX_DEPTH) {
		return { status: 'undetermined', moves: [] };
	}

	const key = stateKey(state);
	if (visited.has(key)) {
		return { status: 'unsolvable', moves: [] };
	}
	visited.add(key);

	if (isWon(state)) {
		return { status: 'solvable', moves: [] };
	}

	context.nodesVisited++;
	if (context.nodesVisited % CHECK_INTERVAL === 0 && Date.now() - startTime > timeoutMs) {
		return { status: 'undetermined', moves: [] };
	}

	const moves = generateMoves(state);
	for (const move of moves) {
		const nextState = applyMove(state, move);
		const result = dfsPath(nextState, visited, startTime, timeoutMs, context, depth + 1);
		if (result.status === 'solvable') {
			return { status: 'solvable', moves: [move, ...result.moves] };
		}
		if (result.status === 'undetermined') {
			return { status: 'undetermined', moves: [] };
		}
	}

	return { status: 'unsolvable', moves: [] };
}

export function searchPath(initialState: GameSnapshot, timeoutMs: number): SolverPathResult {
	const visited = new Set<string>();
	const startTime = Date.now();
	const context = { nodesVisited: 0 };

	const result = dfsPath(initialState, visited, startTime, timeoutMs, context);
	return { status: result.status, moves: result.moves };
}

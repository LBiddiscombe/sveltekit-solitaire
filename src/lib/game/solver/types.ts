import type { PileRef } from '../types';

export type SolverMove =
	| { kind: 'draw' }
	| { kind: 'recycle' }
	| { kind: 'move'; from: PileRef; cardIndex: number; count: number; to: PileRef };

export type SolvableStatus = 'solvable' | 'unsolvable' | 'undetermined';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface SolverResult {
	status: SolvableStatus;
	nextMove: SolverMove | null;
}

export interface SolverPathResult {
	status: SolvableStatus;
	moves: SolverMove[];
}

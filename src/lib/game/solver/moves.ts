import type { Card, PileRef } from '../types';
import type { GameSnapshot } from '../snapshot';
import { deepClone } from '../snapshot';
import {
	canPlaceOnTableau,
	canMoveFromTableau,
	findMovesToFoundation,
	isProductiveTableauMove
} from '../rules';
import type { SolverMove } from './types';

function getPile(state: GameSnapshot, ref: PileRef): Card[] {
	switch (ref.kind) {
		case 'stock':
			return state.stock;
		case 'waste':
			return state.waste;
		case 'tableau':
			return state.tableau[ref.index];
		case 'foundation':
			return state.foundations[ref.index];
	}
}

export function generateMoves(state: GameSnapshot): SolverMove[] {
	const foundationMoves: SolverMove[] = [];
	const revealMoves: SolverMove[] = [];
	const wasteToTableauMoves: SolverMove[] = [];
	const tableauToTableauMoves: SolverMove[] = [];
	const drawRecycleMoves: SolverMove[] = [];
	const foundationPullMoves: SolverMove[] = [];

	for (let i = 0; i < 7; i++) {
		const col = state.tableau[i];
		if (col.length === 0) continue;
		const top = col[col.length - 1];
		if (!top.faceUp) continue;
		const fi = findMovesToFoundation(top, state.foundations);
		if (fi !== null) {
			foundationMoves.push({
				kind: 'move',
				from: { kind: 'tableau', index: i },
				cardIndex: col.length - 1,
				count: 1,
				to: { kind: 'foundation', index: fi }
			});
		}
	}

	if (state.waste.length > 0) {
		const top = state.waste[state.waste.length - 1];
		const fi = findMovesToFoundation(top, state.foundations);
		if (fi !== null) {
			foundationMoves.push({
				kind: 'move',
				from: { kind: 'waste', index: 0 },
				cardIndex: state.waste.length - 1,
				count: 1,
				to: { kind: 'foundation', index: fi }
			});
		}
	}

	for (let i = 0; i < 7; i++) {
		const col = state.tableau[i];
		for (let j = 0; j < col.length; j++) {
			const card = col[j];
			if (!card.faceUp) continue;
			const cardsBelow = col.slice(j + 1);
			if (!canMoveFromTableau(card, cardsBelow)) continue;

			const revealsFaceDown = j > 0 && !col[j - 1].faceUp;
			const productive = revealsFaceDown || isProductiveTableauMove(col, j, state.foundations);

			for (let k = 0; k < 7; k++) {
				if (k === i) continue;
				const target =
					state.tableau[k].length > 0 ? state.tableau[k][state.tableau[k].length - 1] : null;
				if (canPlaceOnTableau(card, target) && productive) {
					const move: SolverMove = {
						kind: 'move',
						from: { kind: 'tableau', index: i },
						cardIndex: j,
						count: col.length - j,
						to: { kind: 'tableau', index: k }
					};
					if (revealsFaceDown) {
						revealMoves.push(move);
					} else {
						tableauToTableauMoves.push(move);
					}
				}
			}
		}
	}

	if (state.waste.length > 0) {
		const top = state.waste[state.waste.length - 1];
		for (let k = 0; k < 7; k++) {
			const target =
				state.tableau[k].length > 0 ? state.tableau[k][state.tableau[k].length - 1] : null;
			if (canPlaceOnTableau(top, target)) {
				wasteToTableauMoves.push({
					kind: 'move',
					from: { kind: 'waste', index: 0 },
					cardIndex: state.waste.length - 1,
					count: 1,
					to: { kind: 'tableau', index: k }
				});
			}
		}
	}

	if (state.stock.length > 0) {
		drawRecycleMoves.push({ kind: 'draw' });
	} else if (state.waste.length > 0) {
		drawRecycleMoves.push({ kind: 'recycle' });
	}

	for (let i = 0; i < 4; i++) {
		const pile = state.foundations[i];
		if (pile.length === 0) continue;
		const top = pile[pile.length - 1];
		for (let k = 0; k < 7; k++) {
			const target =
				state.tableau[k].length > 0 ? state.tableau[k][state.tableau[k].length - 1] : null;
			if (canPlaceOnTableau(top, target)) {
				foundationPullMoves.push({
					kind: 'move',
					from: { kind: 'foundation', index: i },
					cardIndex: pile.length - 1,
					count: 1,
					to: { kind: 'tableau', index: k }
				});
			}
		}
	}

	return [
		...foundationMoves,
		...revealMoves,
		...wasteToTableauMoves,
		...tableauToTableauMoves,
		...drawRecycleMoves,
		...foundationPullMoves
	];
}

export function applyMove(state: GameSnapshot, move: SolverMove): GameSnapshot {
	const next = deepClone(state);

	switch (move.kind) {
		case 'draw': {
			const count = Math.min(3, next.stock.length);
			const drawn = next.stock.splice(0, count);
			for (const card of drawn) card.faceUp = true;
			next.waste.push(...drawn);
			break;
		}
		case 'recycle': {
			next.stock = next.waste.map((c) => ({ ...c, faceUp: false }));
			next.waste = [];
			break;
		}
		case 'move': {
			const source = getPile(next, move.from);
			const dest = getPile(next, move.to);
			const moved = source.splice(move.cardIndex, move.count);
			dest.push(...moved);
			if (move.from.kind === 'tableau' && source.length > 0 && !source[source.length - 1].faceUp) {
				source[source.length - 1].faceUp = true;
			}
			break;
		}
	}

	return next;
}

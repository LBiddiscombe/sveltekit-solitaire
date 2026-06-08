import type { Card } from './types';
import { findMovesToFoundation, canPlaceOnTableau } from './rules';

export interface GameSnapshot {
	stock: Card[];
	waste: Card[];
	tableau: Card[][];
	foundations: Card[][];
}

export function cloneCards(cards: Card[]): Card[] {
	return cards.map((c) => ({ ...c }));
}

export function deepClone(snapshot: GameSnapshot): GameSnapshot {
	return {
		stock: cloneCards(snapshot.stock),
		waste: cloneCards(snapshot.waste),
		tableau: snapshot.tableau.map(cloneCards),
		foundations: snapshot.foundations.map(cloneCards)
	};
}

export function isWon(snapshot: GameSnapshot): boolean {
	return snapshot.foundations.every((p) => p.length === 13);
}

export function simulateStockCycle(snapshot: GameSnapshot): boolean {
	const state = deepClone(snapshot);

	let anyPlaced = false;

	for (let cycle = 0; cycle < 3; cycle++) {
		while (state.stock.length > 0) {
			const count = Math.min(3, state.stock.length);
			const drawn = state.stock.splice(0, count);
			for (const card of drawn) {
				card.faceUp = true;
				state.waste.push(card);
			}

			while (state.waste.length > 0) {
				const top = state.waste[state.waste.length - 1];

				const fi = findMovesToFoundation(top, state.foundations);
				if (fi !== null) {
					state.waste.pop();
					state.foundations[fi].push(top);
					anyPlaced = true;
					continue;
				}

				let placed = false;
				for (let i = 0; i < 7; i++) {
					const target =
						state.tableau[i].length > 0 ? state.tableau[i][state.tableau[i].length - 1] : null;
					if (canPlaceOnTableau(top, target)) {
						state.waste.pop();
						state.tableau[i].push(top);
						anyPlaced = true;
						placed = true;
						break;
					}
				}
				if (placed) continue;

				break;
			}
		}

		if (state.waste.length > 0) {
			for (const card of state.waste) {
				card.faceUp = false;
			}
			state.stock.push(...state.waste.splice(0));
		} else {
			return true;
		}
	}

	return anyPlaced;
}

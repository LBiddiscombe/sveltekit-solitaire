import type { Card } from './types';

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

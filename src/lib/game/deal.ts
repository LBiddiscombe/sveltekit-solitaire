import type { Card } from './types';
import { SUITS, RANKS } from './types';

export function createDeck(): Card[] {
	const cards: Card[] = [];
	for (const suit of SUITS) {
		for (const rank of RANKS) {
			cards.push({ suit, rank, faceUp: false });
		}
	}
	return cards;
}

export function shuffle(cards: Card[]): Card[] {
	const result = [...cards];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

export function deal(deck: Card[]): {
	stock: Card[];
	tableau: [Card[], Card[], Card[], Card[], Card[], Card[], Card[]];
} {
	const tableau: [Card[], Card[], Card[], Card[], Card[], Card[], Card[]] = [
		[],
		[],
		[],
		[],
		[],
		[],
		[]
	];
	let cursor = 0;
	for (let col = 0; col < 7; col++) {
		for (let row = col; row < 7; row++) {
			const card = { ...deck[cursor] };
			card.faceUp = row === col;
			tableau[row].push(card);
			cursor++;
		}
	}
	const stock = deck.slice(cursor).map((c) => ({ ...c, faceUp: false }));
	return { stock, tableau };
}

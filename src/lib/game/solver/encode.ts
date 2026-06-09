import type { Card } from '../types';
import { SUITS, RANKS } from '../types';
import type { GameSnapshot } from '../snapshot';

function encodeCard(card: Card): number {
	const suitIndex = SUITS.indexOf(card.suit);
	const rankIndex = RANKS.indexOf(card.rank);
	return suitIndex * 13 + rankIndex + (card.faceUp ? 52 : 0);
}

export function stateKey(state: GameSnapshot): string {
	return [
		's:' + state.stock.map(encodeCard).join(','),
		'w:' + state.waste.map(encodeCard).join(','),
		't:' + state.tableau.map((col) => col.map(encodeCard).join(',')).join(';'),
		'f:' + state.foundations.map((col) => col.map(encodeCard).join(',')).join(';')
	].join('|');
}

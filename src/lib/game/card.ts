import type { Suit, Rank } from './types';
import { RANKS } from './types';

export function suitColor(suit: Suit): 'red' | 'black' {
	return suit === 'diamonds' || suit === 'hearts' ? 'red' : 'black';
}

export function rankOrder(rank: Rank): number {
	return RANKS.indexOf(rank);
}

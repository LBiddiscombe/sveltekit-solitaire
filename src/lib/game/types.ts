export type Suit = 'spades' | 'clubs' | 'diamonds' | 'hearts';
export type Rank = 'a' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'j' | 'q' | 'k';
export type PileKind = 'stock' | 'waste' | 'tableau' | 'foundation';

export interface Card {
	suit: Suit;
	rank: Rank;
	faceUp: boolean;
}

export interface PileRef {
	kind: PileKind;
	index: number;
}

export const RANKS: Rank[] = ['a', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'j', 'q', 'k'];
export const SUITS: Suit[] = ['spades', 'clubs', 'diamonds', 'hearts'];

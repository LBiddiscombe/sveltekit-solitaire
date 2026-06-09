import type { Card } from './types';
import { suitColor, rankOrder } from './card';

export function canPlaceOnTableau(moving: Card, target: Card | null): boolean {
	if (!target) {
		return moving.rank === 'k';
	}
	if (!target.faceUp) return false;
	const oppositeColor = suitColor(moving.suit) !== suitColor(target.suit);
	const oneLower = rankOrder(target.rank) === rankOrder(moving.rank) + 1;
	return oppositeColor && oneLower;
}

export function canPlaceOnFoundation(moving: Card, target: Card | null): boolean {
	if (!target) {
		return moving.rank === 'a';
	}
	if (!target.faceUp) return false;
	const sameSuit = moving.suit === target.suit;
	const oneHigher = rankOrder(moving.rank) === rankOrder(target.rank) + 1;
	return sameSuit && oneHigher;
}

export function canMoveFromTableau(card: Card, cardsBelow: Card[]): boolean {
	if (!card.faceUp) return false;
	let prev = card;
	for (const below of cardsBelow) {
		if (!below.faceUp) return false;
		const oppositeColor = suitColor(below.suit) !== suitColor(prev.suit);
		const nextRank = rankOrder(prev.rank) === rankOrder(below.rank) + 1;
		if (!oppositeColor || !nextRank) return false;
		prev = below;
	}
	return true;
}

export function findMovesToFoundation(moving: Card, foundations: Card[][]): number | null {
	for (let i = 0; i < 4; i++) {
		const top = foundations[i].length > 0 ? foundations[i][foundations[i].length - 1] : null;
		if (canPlaceOnFoundation(moving, top)) {
			return i;
		}
	}
	return null;
}

export function findMovesToTableau(moving: Card, tableaus: Card[][]): number | null {
	for (let i = 0; i < 7; i++) {
		const top = tableaus[i].length > 0 ? tableaus[i][tableaus[i].length - 1] : null;
		if (canPlaceOnTableau(moving, top)) {
			return i;
		}
	}
	return null;
}

export function isProductiveTableauMove(col: Card[], j: number, foundations: Card[][]): boolean {
	if (j > 0) {
		const underneath = col[j - 1];
		if (!underneath.faceUp) return true;
		return findMovesToFoundation(underneath, foundations) !== null;
	}
	return col[j].rank !== 'k';
}

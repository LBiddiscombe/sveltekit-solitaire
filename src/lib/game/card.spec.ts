import { describe, it, expect } from 'vitest';
import { suitColor, rankOrder } from './card';
import type { Rank } from './types';

describe('suitColor', () => {
	it('returns red for diamonds', () => {
		expect(suitColor('diamonds')).toBe('red');
	});

	it('returns red for hearts', () => {
		expect(suitColor('hearts')).toBe('red');
	});

	it('returns black for spades', () => {
		expect(suitColor('spades')).toBe('black');
	});

	it('returns black for clubs', () => {
		expect(suitColor('clubs')).toBe('black');
	});
});

describe('rankOrder', () => {
	it('returns 0 for ace', () => {
		expect(rankOrder('a')).toBe(0);
	});

	it('returns 1 for 2', () => {
		expect(rankOrder('2')).toBe(1);
	});

	it('returns 12 for king', () => {
		expect(rankOrder('k')).toBe(12);
	});

	it('returns correct order for all ranks', () => {
		const ranks: Rank[] = ['a', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'j', 'q', 'k'];
		ranks.forEach((rank, i) => {
			expect(rankOrder(rank)).toBe(i);
		});
	});
});

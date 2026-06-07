import type { Card } from './types';

const globImages = import.meta.glob('$lib/assets/cards/*.svg', {
	eager: true,
	query: '?url',
	import: 'default'
}) as Record<string, string>;

const cardImages: Record<string, string> = {};
for (const [path, url] of Object.entries(globImages)) {
	const filename = path.split('/').pop()!;
	const name = filename.replace('.svg', '');
	cardImages[name] = url;
}

const rankMap: Record<string, string> = {
	a: 'A',
	'2': '2',
	'3': '3',
	'4': '4',
	'5': '5',
	'6': '6',
	'7': '7',
	'8': '8',
	'9': '9',
	'10': 'T',
	j: 'J',
	q: 'Q',
	k: 'K'
};

const suitMap: Record<string, string> = {
	spades: 'S',
	clubs: 'C',
	diamonds: 'D',
	hearts: 'H'
};

export function cardImageUrl(card: Card): string {
	return cardImages[`${rankMap[card.rank]}${suitMap[card.suit]}`] ?? '';
}

export function cardBackUrl(): string {
	return cardImages['1B'] ?? '';
}

export function preloadCardImages(): void {
	for (const url of Object.values(cardImages)) {
		const img = new Image();
		img.src = url;
	}
}

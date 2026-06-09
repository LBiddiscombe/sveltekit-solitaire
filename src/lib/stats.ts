const STORAGE_KEY = 'solitaire-stats';
const MAX_RECENT = 20;

export type GameMode = 'random' | 'winnable';

interface GameResult {
	won: boolean;
	cardsToFoundation: number;
}

interface ModeStats {
	lifetime: {
		gamesPlayed: number;
		gamesWon: number;
		totalCardsToFoundation: number;
	};
	recent: GameResult[];
}

export interface StatsData {
	random: ModeStats;
	winnable: ModeStats;
}

const defaultModeStats = (): ModeStats => ({
	lifetime: { gamesPlayed: 0, gamesWon: 0, totalCardsToFoundation: 0 },
	recent: []
});

function read(): StatsData {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const data = JSON.parse(raw);
			return {
				random: { ...defaultModeStats(), ...data.random },
				winnable: { ...defaultModeStats(), ...data.winnable }
			} satisfies StatsData;
		}
	} catch {
		/* best-effort */
	}
	return { random: defaultModeStats(), winnable: defaultModeStats() };
}

function write(data: StatsData) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	} catch {
		/* best-effort */
	}
}

export function getStats(): StatsData {
	return read();
}

export function recordGame(mode: GameMode, won: boolean, cardsToFoundation: number) {
	const data = read();
	const modeStats = data[mode];

	modeStats.lifetime.gamesPlayed++;
	if (won) modeStats.lifetime.gamesWon++;
	modeStats.lifetime.totalCardsToFoundation += cardsToFoundation;

	modeStats.recent.push({ won, cardsToFoundation });
	if (modeStats.recent.length > MAX_RECENT) {
		modeStats.recent.shift();
	}

	write(data);
}

export interface ComputedStats {
	gamesPlayed: number;
	gamesWon: number;
	winRate: number;
	avgCompletion: number;
}

export function getLifetimeStats(mode: GameMode): ComputedStats {
	const data = read();
	const { gamesPlayed, gamesWon, totalCardsToFoundation } = data[mode].lifetime;
	return {
		gamesPlayed,
		gamesWon,
		winRate: gamesPlayed > 0 ? gamesWon / gamesPlayed : 0,
		avgCompletion: gamesPlayed > 0 ? totalCardsToFoundation / (gamesPlayed * 52) : 0
	};
}

export function getRecentStats(mode: GameMode): ComputedStats {
	const data = read();
	const recent = data[mode].recent;
	if (recent.length === 0) {
		return { gamesPlayed: 0, gamesWon: 0, winRate: 0, avgCompletion: 0 };
	}
	const wins = recent.filter((r) => r.won).length;
	const totalCards = recent.reduce((sum, r) => sum + r.cardsToFoundation, 0);
	return {
		gamesPlayed: recent.length,
		gamesWon: wins,
		winRate: wins / recent.length,
		avgCompletion: totalCards / (recent.length * 52)
	};
}

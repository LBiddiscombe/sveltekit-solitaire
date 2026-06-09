const STORAGE_KEY = 'solitaire-settings';

export interface Settings {
	onlyWinnable: boolean;
}

const defaults: Settings = {
	onlyWinnable: false
};

export function getSettings(): Settings {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const data = JSON.parse(raw);
			return { ...defaults, ...data };
		}
	} catch {
		/* best-effort */
	}
	return { ...defaults };
}

export function updateSettings(partial: Partial<Settings>): Settings {
	const current = getSettings();
	const updated = { ...current, ...partial };
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
	} catch {
		/* best-effort */
	}
	return updated;
}

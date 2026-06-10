export interface StorageAdapter {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

export const localStorageAdapter: StorageAdapter = {
	getItem(key) {
		try {
			return localStorage.getItem(key);
		} catch {
			return null;
		}
	},
	setItem(key, value) {
		try {
			localStorage.setItem(key, value);
		} catch {
			/* best-effort */
		}
	},
	removeItem(key) {
		try {
			localStorage.removeItem(key);
		} catch {
			/* best-effort */
		}
	}
};

export function createInMemoryAdapter(): StorageAdapter {
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- non-reactive test helper
	const store = new Map<string, string>();
	return {
		getItem(key) {
			return store.get(key) ?? null;
		},
		setItem(key, value) {
			store.set(key, value);
		},
		removeItem(key) {
			store.delete(key);
		}
	};
}

export const STORAGE_KEY = 'solitaire-game';

export class GameStore {
	hasSaved = $state(false);
	private timer: ReturnType<typeof setTimeout> | null = null;
	private pendingValue: string | null = null;

	constructor(
		private adapter: StorageAdapter = localStorageAdapter,
		private debounceMs: number = 5_000
	) {
		this.hasSaved = adapter.getItem(STORAGE_KEY) !== null;
	}

	set<T>(value: T): void {
		this.pendingValue = JSON.stringify(value);
		this.hasSaved = true;
		if (this.timer) clearTimeout(this.timer);
		this.timer = setTimeout(() => {
			this.timer = null;
			if (this.pendingValue !== null) {
				this.adapter.setItem(STORAGE_KEY, this.pendingValue);
				this.pendingValue = null;
			}
		}, this.debounceMs);
	}

	get<T>(): T | null {
		const raw = this.adapter.getItem(STORAGE_KEY);
		if (!raw) return null;
		try {
			return JSON.parse(raw) as T;
		} catch {
			return null;
		}
	}

	flush(): void {
		if (this.timer !== null) {
			clearTimeout(this.timer);
			this.timer = null;
		}
		if (this.pendingValue !== null) {
			this.adapter.setItem(STORAGE_KEY, this.pendingValue);
			this.pendingValue = null;
		}
	}

	delete(): void {
		if (this.timer !== null) {
			clearTimeout(this.timer);
			this.timer = null;
		}
		this.pendingValue = null;
		this.adapter.removeItem(STORAGE_KEY);
		this.hasSaved = false;
	}
}

export const gameStore = new GameStore();

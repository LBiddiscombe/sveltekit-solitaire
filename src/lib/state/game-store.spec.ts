import { describe, it, expect, beforeEach } from 'vitest';
import { GameStore, createInMemoryAdapter, STORAGE_KEY } from './game-store.svelte';

describe('GameStore', () => {
	let store: GameStore;

	beforeEach(() => {
		store = new GameStore(createInMemoryAdapter(), 0);
	});

	it('starts with hasSaved false when no data exists', () => {
		expect(store.hasSaved).toBe(false);
	});

	it('set writes data to adapter and marks hasSaved', () => {
		store.set({ score: 42 });
		expect(store.hasSaved).toBe(true);
	});

	it('get returns the written data after flush', () => {
		store.set({ score: 42, name: 'test' });
		store.flush();
		const data = store.get<{ score: number; name: string }>();
		expect(data).toEqual({ score: 42, name: 'test' });
	});

	it('get returns null when no data exists', () => {
		expect(store.get()).toBe(null);
	});

	it('delete removes data and clears hasSaved', () => {
		store.set({ score: 42 });
		store.flush();
		expect(store.hasSaved).toBe(true);
		store.delete();
		expect(store.hasSaved).toBe(false);
		expect(store.get()).toBe(null);
	});

	it('delete clears pending timer value', () => {
		const adapter = createInMemoryAdapter();
		const storeWithDebounce = new GameStore(adapter, 100);
		storeWithDebounce.set({ score: 42 });
		storeWithDebounce.delete();
		expect(adapter.getItem(STORAGE_KEY)).toBe(null);
	});

	it('flush immediately writes pending data', () => {
		const adapter = createInMemoryAdapter();
		const storeWithDebounce = new GameStore(adapter, 10_000);
		storeWithDebounce.set({ score: 42 });
		storeWithDebounce.flush();
		expect(adapter.getItem(STORAGE_KEY)).toBe('{"score":42}');
	});

	it('multiple set calls override pending value', () => {
		store.set({ score: 1 });
		store.set({ score: 2 });
		store.flush();
		expect(store.get<{ score: number }>()!.score).toBe(2);
	});

	it('hasSaved is true on construction when data exists', () => {
		const adapter = createInMemoryAdapter();
		adapter.setItem(STORAGE_KEY, '"hello"');
		const preloaded = new GameStore(adapter, 0);
		expect(preloaded.hasSaved).toBe(true);
	});
});

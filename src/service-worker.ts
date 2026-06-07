/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />
/// <reference types="../.svelte-kit/ambient.d.ts" />

import { build, files, version } from '$service-worker';

const self = /** @type {ServiceWorkerGlobalScope} */ /** @type {unknown} */ globalThis.self;

const APP_CACHE = `app-${version}`;
const SVG_CACHE = `svgs-${version}`;
const DYNAMIC_CACHE = `dynamic-${version}`;

const ASSETS = [...build, ...files];

self.addEventListener('install', (event) => {
	async function cacheAppShell() {
		const cache = await caches.open(APP_CACHE);
		await cache.addAll(ASSETS);
	}
	event.waitUntil(cacheAppShell());
});

self.addEventListener('activate', (event) => {
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== APP_CACHE && key !== SVG_CACHE && key !== DYNAMIC_CACHE) {
				await caches.delete(key);
			}
		}
	}
	event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	async function respond() {
		const url = new URL(event.request.url);
		const path = url.pathname;

		if (ASSETS.includes(path)) {
			const cache = await caches.open(APP_CACHE);
			const cached = await cache.match(path);
			if (cached) return cached;
		}

		if (path.endsWith('.svg')) {
			const cache = await caches.open(SVG_CACHE);
			const cached = await cache.match(event.request);
			if (cached) return cached;
			try {
				const response = await fetch(event.request);
				if (response.ok) {
					cache.put(event.request, response.clone());
				}
				return response;
			} catch {
				return new Response(null, { status: 404 });
			}
		}

		try {
			const response = await fetch(event.request);
			if (
				response.ok &&
				response.status === 200 &&
				!response.headers.get('cache-control')?.includes('no-store')
			) {
				const cache = await caches.open(DYNAMIC_CACHE);
				cache.put(event.request, response.clone());
			}
			return response;
		} catch {
			const cache = await caches.open(DYNAMIC_CACHE);
			const cached = await cache.match(event.request);
			if (cached) return cached;
			throw new Error('offline');
		}
	}

	event.respondWith(respond());
});

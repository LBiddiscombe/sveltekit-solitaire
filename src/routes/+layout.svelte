<script lang="ts">
	import { resolveRoute } from '$app/paths';
	import './layout.css';

	let { children } = $props();
</script>

<header class="sticky top-0 z-40 border-b border-white/10" style="background-color: #14532d">
	<div class="mx-auto flex h-12 max-w-4xl items-center justify-between px-4">
		<a href={resolveRoute('/')} class="text-lg font-bold tracking-tight text-white/90">Solitaire</a>
		<nav class="flex gap-4 text-sm font-medium text-white/60">
			<a href={resolveRoute('/')} class="transition-colors hover:text-white/90">Play</a>
			<a href={resolveRoute('/stats')} class="transition-colors hover:text-white/90">Stats</a>
			<a href={resolveRoute('/about')} class="transition-colors hover:text-white/90">About</a>
			<a href={resolveRoute('/settings')} class="transition-colors hover:text-white/90">Settings</a>
		</nav>
	</div>
</header>

<div class="min-h-[calc(100dvh-3rem)]">{@render children()}</div>

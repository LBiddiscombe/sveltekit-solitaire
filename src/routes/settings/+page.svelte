<script lang="ts">
	import { resolveRoute } from '$app/paths';
	import { getSettings, updateSettings } from '$lib/settings';
	import { game } from '$lib/state/game.svelte';

	let settings = $state(getSettings());

	function toggleOnlyWinnable() {
		const next = !settings.onlyWinnable;
		settings = updateSettings({ onlyWinnable: next });
	}

	const mailtoHref = $derived.by(() => {
		const subject = game.seed !== undefined ? `Solitaire Issue - ${game.seed}` : 'Solitaire Issue';

		const state = {
			stock: game.stock,
			waste: game.waste,
			tableau: game.tableau,
			foundations: game.foundations,
			seed: game.seed,
			mode: game.mode,
			difficulty: game.difficulty,
			moveCount: game.moveCount
		};

		const body = [
			"Please describe the issue you're experiencing:",
			'',
			'[Describe your issue here]',
			'',
			'--- Game State ---',
			JSON.stringify(state)
		].join('\n');

		return `mailto:lee.biddiscombe@btinternet.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
	});
</script>

<div class="flex flex-col items-center gap-6 px-4 py-8 pb-28">
	<div class="w-full max-w-md rounded-xl bg-white/5 p-8 backdrop-blur-sm">
		<h1 class="text-2xl font-bold text-white/90">Settings</h1>
		<div class="mt-6 space-y-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium text-white/90">Only winnable games</p>
					<p class="mt-0.5 text-sm leading-relaxed text-white/50">
						When starting a new game, automatically discard deals the solver can't prove is
						solvable. May briefly delay the deal while the solver runs.
					</p>
				</div>
				<button
					role="switch"
					aria-checked={settings.onlyWinnable}
					aria-label="Only winnable games toggle"
					onclick={toggleOnlyWinnable}
					class="relative ml-4 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 focus:outline-none {settings.onlyWinnable
						? 'bg-emerald-500'
						: 'bg-white/20'}"
				>
					<span
						class="inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform {settings.onlyWinnable
							? 'translate-x-5'
							: 'translate-x-0'}"
					></span>
				</button>
			</div>
		</div>
	</div>

	<div class="w-full max-w-md rounded-xl bg-white/5 p-8 backdrop-blur-sm">
		<h2 class="text-lg font-bold text-white/90">Report Issue</h2>
		<p class="mt-2 text-sm leading-relaxed text-white/50">
			Open an email with the current game state attached for debugging.
		</p>
		<a
			href={mailtoHref}
			rel="external"
			class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white/80 transition-all hover:bg-white/20 active:scale-95"
		>
			Report Issue
		</a>
	</div>
</div>

<div
	class="fixed bottom-8 left-1/2 z-30 -translate-x-1/2"
	style="touch-action: auto; user-select: auto;"
>
	<div
		class="flex items-center rounded-xl bg-black/20 px-1 py-1 shadow-lg shadow-black/10 backdrop-blur-sm"
	>
		<a
			href={resolveRoute('/')}
			class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-white/80 transition-all hover:bg-white/10 active:scale-95"
		>
			← Back to Game
		</a>
	</div>
</div>

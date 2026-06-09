<script lang="ts">
	import { resolveRoute } from '$app/paths';
	import { getSettings, updateSettings } from '$lib/settings';

	let settings = $state(getSettings());
	let showClearConfirm = $state(false);

	function toggleOnlyWinnable() {
		const next = !settings.onlyWinnable;
		settings = updateSettings({ onlyWinnable: next });
	}

	function clearSavedData() {
		localStorage.removeItem('solitaire-game');
		showClearConfirm = false;
	}
</script>

<div class="flex min-h-[calc(100dvh-12rem)] items-center justify-center px-4">
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
		<hr class="border-white/10" />
		<div class="flex items-center justify-between">
			<div>
				<p class="font-medium text-white/90">Clear saved game</p>
				<p class="mt-0.5 text-sm leading-relaxed text-white/50">
					Delete the saved game from your browser. Your current game will be lost on the next
					page load.
				</p>
			</div>
			<button
				onclick={() => (showClearConfirm = true)}
				class="ml-4 shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-red-700 active:scale-95"
			>
				Clear
			</button>
		</div>
	</div>
</div>

{#if showClearConfirm}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div class="rounded-xl bg-white p-8 text-center shadow-2xl">
			<h2 class="mb-4 text-3xl font-bold">Clear Saved Game?</h2>
			<p class="mx-auto mb-4 max-w-sm text-sm text-gray-600">
				Your current game progress will be lost. This cannot be undone.
			</p>
			<div class="flex justify-center gap-3">
				<button
					class="rounded-lg bg-gray-600 px-6 py-2 text-white hover:bg-gray-700"
					onclick={() => (showClearConfirm = false)}
				>
					Cancel
				</button>
				<button
					class="rounded-lg bg-red-600 px-6 py-2 text-white hover:bg-red-700"
					onclick={clearSavedData}
				>
					Clear
				</button>
			</div>
		</div>
	</div>
{/if}

<div
	class="fixed bottom-4 left-1/2 z-30 -translate-x-1/2"
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

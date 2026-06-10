<script lang="ts">
	import { resolveRoute } from '$app/paths';
	import { getLifetimeStats, getRecentStats } from '$lib/stats';
	import type { ComputedStats } from '$lib/stats';

	let lifetimeRandom = $state<ComputedStats>({
		gamesPlayed: 0,
		gamesWon: 0,
		winRate: 0,
		avgMoves: 0,
		avgCompletion: 0
	});
	let recentRandom = $state<ComputedStats>({
		gamesPlayed: 0,
		gamesWon: 0,
		winRate: 0,
		avgMoves: 0,
		avgCompletion: 0
	});
	let lifetimeWinnable = $state<ComputedStats>({
		gamesPlayed: 0,
		gamesWon: 0,
		winRate: 0,
		avgMoves: 0,
		avgCompletion: 0
	});
	let recentWinnable = $state<ComputedStats>({
		gamesPlayed: 0,
		gamesWon: 0,
		winRate: 0,
		avgMoves: 0,
		avgCompletion: 0
	});
	let showClearConfirm = $state(false);

	function refresh() {
		lifetimeRandom = getLifetimeStats('random');
		recentRandom = getRecentStats('random');
		lifetimeWinnable = getLifetimeStats('winnable');
		recentWinnable = getRecentStats('winnable');
	}

	function clearAllData() {
		localStorage.removeItem('solitaire-game');
		localStorage.removeItem('solitaire-stats');
		showClearConfirm = false;
		refresh();
	}

	$effect(refresh);

	function pct(v: number): string {
		return `${(v * 100).toFixed(1)}%`;
	}
</script>

<div class="mx-auto max-w-4xl px-4 py-8">
	<h1 class="mb-8 text-2xl font-bold text-white/90">Statistics</h1>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
		<!-- Winnable Only -->
		<div class="rounded-xl bg-white/5 p-6 backdrop-blur-sm">
			<h2 class="mb-4 text-lg font-semibold text-white/90">Winnable Only</h2>
			<table class="w-full text-sm">
				<thead>
					<tr
						class="border-b border-white/10 text-left text-xs tracking-wide text-white/40 uppercase"
					>
						<th class="pb-2 font-medium"></th>
						<th class="pb-2 font-medium">Lifetime</th>
						<th class="pb-2 font-medium">Last 20</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-white/10">
					<tr>
						<td class="py-2 text-white/50">Games Played</td>
						<td class="py-2 font-medium text-white/90">{lifetimeWinnable.gamesPlayed}</td>
						<td class="py-2 font-medium text-white/90">{recentWinnable.gamesPlayed}</td>
					</tr>
					<tr>
						<td class="py-2 text-white/50">Games Won</td>
						<td class="py-2 font-medium text-white/90">{lifetimeWinnable.gamesWon}</td>
						<td class="py-2 font-medium text-white/90">{recentWinnable.gamesWon}</td>
					</tr>
					<tr>
						<td class="py-2 text-white/50">Win %</td>
						<td class="py-2 font-medium text-white/90">{pct(lifetimeWinnable.winRate)}</td>
						<td class="py-2 font-medium text-white/90">{pct(recentWinnable.winRate)}</td>
					</tr>
					<tr>
						<td class="py-2 text-white/50">Avg Moves</td>
						<td class="py-2 font-medium text-white/90">{lifetimeWinnable.avgMoves.toFixed(1)}</td>
						<td class="py-2 font-medium text-white/90">{recentWinnable.avgMoves.toFixed(1)}</td>
					</tr>
					<tr>
						<td class="py-2 text-white/50">Avg Completion</td>
						<td class="py-2 font-medium text-white/90">{pct(lifetimeWinnable.avgCompletion)}</td>
						<td class="py-2 font-medium text-white/90">{pct(recentWinnable.avgCompletion)}</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Random Draws -->
		<div class="rounded-xl bg-white/5 p-6 backdrop-blur-sm">
			<h2 class="mb-4 text-lg font-semibold text-white/90">Random Draws</h2>
			<table class="w-full text-sm">
				<thead>
					<tr
						class="border-b border-white/10 text-left text-xs tracking-wide text-white/40 uppercase"
					>
						<th class="pb-2 font-medium"></th>
						<th class="pb-2 font-medium">Lifetime</th>
						<th class="pb-2 font-medium">Last 20</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-white/10">
					<tr>
						<td class="py-2 text-white/50">Games Played</td>
						<td class="py-2 font-medium text-white/90">{lifetimeRandom.gamesPlayed}</td>
						<td class="py-2 font-medium text-white/90">{recentRandom.gamesPlayed}</td>
					</tr>
					<tr>
						<td class="py-2 text-white/50">Games Won</td>
						<td class="py-2 font-medium text-white/90">{lifetimeRandom.gamesWon}</td>
						<td class="py-2 font-medium text-white/90">{recentRandom.gamesWon}</td>
					</tr>
					<tr>
						<td class="py-2 text-white/50">Win %</td>
						<td class="py-2 font-medium text-white/90">{pct(lifetimeRandom.winRate)}</td>
						<td class="py-2 font-medium text-white/90">{pct(recentRandom.winRate)}</td>
					</tr>
					<tr>
						<td class="py-2 text-white/50">Avg Moves</td>
						<td class="py-2 font-medium text-white/90">{lifetimeRandom.avgMoves.toFixed(1)}</td>
						<td class="py-2 font-medium text-white/90">{recentRandom.avgMoves.toFixed(1)}</td>
					</tr>
					<tr>
						<td class="py-2 text-white/50">Avg Completion</td>
						<td class="py-2 font-medium text-white/90">{pct(lifetimeRandom.avgCompletion)}</td>
						<td class="py-2 font-medium text-white/90">{pct(recentRandom.avgCompletion)}</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>

	<div class="mt-10 flex flex-col items-center gap-4">
		<button
			onclick={() => (showClearConfirm = true)}
			class="rounded-lg bg-red-600/80 px-5 py-2 text-sm font-medium text-white/80 transition-all hover:bg-red-600 hover:text-white active:scale-95"
		>
			Clear all data
		</button>
		<p class="text-xs text-white/30">Removes all statistics and clears any saved game</p>
	</div>

	<div class="mt-6 flex justify-center">
		<div
			class="inline-flex items-center rounded-xl bg-black/20 px-1 py-1 shadow-lg shadow-black/10 backdrop-blur-sm"
		>
			<a
				href={resolveRoute('/')}
				class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-white/80 transition-all hover:bg-white/10 active:scale-95"
			>
				← Back to Game
			</a>
		</div>
	</div>
</div>

{#if showClearConfirm}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div class="rounded-xl bg-white p-8 text-center shadow-2xl">
			<h2 class="mb-4 text-3xl font-bold">Clear All Data?</h2>
			<p class="mx-auto mb-4 max-w-sm text-sm text-gray-600">
				Your current game progress and all statistics will be permanently deleted. You'll start with
				a fresh deal on the next game.
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
					onclick={clearAllData}
				>
					Clear
				</button>
			</div>
		</div>
	</div>
{/if}

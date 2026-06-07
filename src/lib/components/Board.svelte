<script lang="ts">
	import { onMount } from 'svelte';
	import { game } from '$lib/state/game.svelte';
	import Stock from './Stock.svelte';
	import Waste from './Waste.svelte';
	import Pile from './Pile.svelte';

	let boardEl: HTMLDivElement;

	function updateCardSize() {
		if (!boardEl) return;
		const gaps = 6 * 4;
		const available = boardEl.clientWidth - gaps - 16;
		const cardW = Math.min(240, Math.floor(available / 7));
		const cardH = Math.round((cardW * 336) / 240);
		document.documentElement.style.setProperty('--card-width', `${cardW}px`);
		document.documentElement.style.setProperty('--card-height', `${cardH}px`);
	}

	$effect(() => {
		if (boardEl) {
			updateCardSize();
		}
	});

	onMount(() => {
		game.newGame();
	});
</script>

<svelte:window onresize={() => updateCardSize()} />

<div bind:this={boardEl} class="mx-auto flex max-w-4xl flex-col gap-4 p-2">
	<div class="flex items-start justify-between">
		<div class="flex gap-1">
			{#each game.foundations as foundation, i (i)}
				<Pile cards={foundation} kind="foundation" index={i} cascade={0} facedownCascade={0} />
			{/each}
		</div>
		<div class="flex gap-2">
			<Waste cards={game.waste} />
			<Stock cards={game.stock} />
		</div>
	</div>

	<div class="flex gap-1">
		{#each game.tableau as column, i (i)}
			<Pile cards={column} kind="tableau" index={i} />
		{/each}
	</div>

	{#if game.isWon}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div class="rounded-xl bg-white p-8 text-center shadow-2xl">
				<h2 class="mb-4 text-3xl font-bold">You Won!</h2>
				<button
					class="rounded-lg bg-green-600 px-6 py-2 text-white hover:bg-green-700"
					onclick={() => game.newGame()}
				>
					New Game
				</button>
			</div>
		</div>
	{/if}

	<div class="fixed right-4 bottom-4 flex gap-2">
		<button
			class="rounded-full bg-gray-800 px-4 py-2 text-sm text-white disabled:opacity-30"
			disabled={!game.canUndo}
			onclick={() => game.undo()}
		>
			Undo
		</button>
		<button
			class="rounded-full bg-gray-800 px-4 py-2 text-sm text-white disabled:opacity-30"
			disabled={!game.canRedo}
			onclick={() => game.redo()}
		>
			Redo
		</button>
		<button
			class="rounded-full bg-gray-800 px-4 py-2 text-sm text-white"
			onclick={() => game.newGame()}
		>
			New
		</button>
	</div>
</div>

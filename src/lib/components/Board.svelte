<script lang="ts">
	import { onMount } from 'svelte';
	import { game } from '$lib/state/game.svelte';
	import { animationHost } from '$lib/animations/host.svelte';
	import Stock from './Stock.svelte';
	import Waste from './Waste.svelte';
	import Pile from './Pile.svelte';

	let boardEl: HTMLDivElement;
	let solving = $state(false);
	let ready = $state(false);

	function updateCardSize() {
		if (!boardEl) return;
		const gaps = 6 * 4;
		const available = boardEl.clientWidth - gaps - 16;
		const cardW = Math.min(240, Math.floor(available / 7));
		const cardH = Math.round((cardW * 336) / 240);
		document.documentElement.style.setProperty('--card-width', `${cardW}px`);
		document.documentElement.style.setProperty('--card-height', `${cardH}px`);
		ready = true;
	}

	$effect(() => {
		if (boardEl) {
			updateCardSize();
		}
	});

	onMount(() => {
		game.newGame();
		queueMicrotask(() => animationHost.startDeal());
	});

	async function startSolve() {
		if (animationHost.busy) return;
		solving = true;
		await animationHost.startSolve();
		solving = false;
	}

	$effect(() => {
		return () => {
			animationHost.dispose();
		};
	});
</script>

<svelte:window onresize={() => updateCardSize()} />

<div bind:this={boardEl} class="mx-auto flex max-w-4xl flex-col gap-4 p-2" class:invisible={!ready}>
	<div class="flex items-start justify-between">
		<div class="flex gap-1">
			{#each game.foundations as foundation, i (i)}
				<Pile cards={foundation} kind="foundation" index={i} cascade={0} facedownCascade={0} />
			{/each}
		</div>
		<div class="flex gap-2">
			{#if game.canSolve && !solving}
				<button
					class="flex cursor-pointer items-center justify-center rounded-lg bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
					style:width="var(--card-width)"
					style:height="var(--card-height)"
					onclick={startSolve}
				>
					Solve
				</button>
			{:else if game.canSolve && solving}
				<div
					class="flex items-center justify-center rounded-lg bg-emerald-100 font-semibold text-emerald-600"
					style:width="var(--card-width)"
					style:height="var(--card-height)"
				>
					...
				</div>
			{:else}
				<Waste cards={game.waste} />
			{/if}
			<Stock cards={game.stock} />
		</div>
	</div>

	<div class="flex gap-1">
		{#each game.tableau as column, i (i)}
			<Pile cards={column} kind="tableau" index={i} cascade={0.25} facedownCascade={0.1} />
		{/each}
	</div>

	{#if game.isWon}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div class="rounded-xl bg-white p-8 text-center shadow-2xl">
				<h2 class="mb-4 text-3xl font-bold">You Won!</h2>
				<button
					class="rounded-lg bg-green-600 px-6 py-2 text-white hover:bg-green-700"
					onclick={() => {
						animationHost.dispose();
						game.newGame();
						queueMicrotask(() => animationHost.startDeal());
					}}
				>
					New Game
				</button>
			</div>
		</div>
	{/if}

	<div class="fixed bottom-4 left-4">
		<button
			class="rounded-full bg-amber-500 px-4 py-2 text-sm text-white hover:bg-amber-600 disabled:opacity-30"
			disabled={solving}
			onclick={async () => {
				if (animationHost.busy) return;
				const hint = game.findBestHint();
				if (!hint) return;
				game.hint = hint;
				if (hint.from.kind === 'stock') {
					setTimeout(() => {
						if (game.hint === hint) game.clearHint();
					}, 1200);
				} else {
					await animationHost.showHint(hint);
					if (game.hint === hint) game.clearHint();
				}
			}}
		>
			Hint
		</button>
	</div>

	<div class="fixed right-4 bottom-4 flex gap-2">
		<button
			class="rounded-full bg-gray-800 px-4 py-2 text-sm text-white disabled:opacity-30"
			disabled={!game.canUndo || solving}
			onclick={() => game.undo()}
		>
			Undo
		</button>
		<button
			class="rounded-full bg-gray-800 px-4 py-2 text-sm text-white disabled:opacity-30"
			disabled={!game.canRedo || solving}
			onclick={() => game.redo()}
		>
			Redo
		</button>
		<button
			class="rounded-full bg-gray-800 px-4 py-2 text-sm text-white"
			onclick={() => {
				animationHost.dispose();
				game.newGame();
				queueMicrotask(() => animationHost.startDeal());
			}}
		>
			New
		</button>
	</div>
</div>

<script lang="ts">
	import { onMount } from 'svelte';
	import { game, persistAfterDeal, simulateStockCycle } from '$lib/state/game.svelte';
	import { animationHost } from '$lib/animations/host.svelte';
	import { preloadCardImages } from '$lib/game/card-images';
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

	async function startNewGame() {
		animationHost.dispose();
		game.newGame();
		await animationHost.startDeal();
		persistAfterDeal();
	}

	onMount(() => {
		preloadCardImages();
		if (!game.hasSaved) {
			startNewGame();
		}
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

<div
	bind:this={boardEl}
	class="mx-auto flex max-w-4xl flex-col gap-4 px-2 pt-4 pb-16"
	class:invisible={!ready}
>
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
					onclick={startNewGame}
				>
					New Game
				</button>
			</div>
		</div>
	{/if}

	{#if game.isStuck}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div class="rounded-xl bg-white p-8 text-center shadow-2xl">
				<h2 class="mb-4 text-3xl font-bold">No More Obvious Moves</h2>
				<p class="mx-auto mb-4 max-w-sm text-sm text-gray-600">
					The hint system couldn't find any immediate moves, even after cycling through the stock.
					This isn't a perfect solver — if you spot a multi-step workaround, go for it!
				</p>
				<div class="flex justify-center gap-3">
					<button
						class="rounded-lg bg-gray-600 px-6 py-2 text-white hover:bg-gray-700"
						onclick={() => game.dismissStuck()}
					>
						Keep Trying
					</button>
					<button
						class="rounded-lg bg-amber-600 px-6 py-2 text-white hover:bg-amber-700"
						onclick={startNewGame}
					>
						New Game
					</button>
				</div>
			</div>
		</div>
	{/if}

	<div
		class="fixed bottom-4 left-1/2 z-30 -translate-x-1/2"
		style="touch-action: auto; -webkit-user-select: auto; user-select: auto;"
	>
		<div
			class="flex flex-nowrap items-center rounded-xl bg-black/20 px-1 py-1 shadow-lg shadow-black/10 backdrop-blur-sm"
		>
			<button
				class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-white/80 transition-all hover:bg-white/10 hover:text-amber-300 active:scale-95 disabled:opacity-30"
				disabled={solving}
				onclick={async () => {
					if (animationHost.busy) return;
					const hint = game.findBestHint();
					if (!hint) return;
					if (hint.from.kind === 'stock') {
						const hasCycleMove = simulateStockCycle(game);
						if (!hasCycleMove) {
							game.stuckOverride = true;
							return;
						}
					}
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
				<span class="-mt-0.5 text-2xl leading-none">✦</span> Hint
			</button>
			<div class="h-5 w-px bg-white/10"></div>
			<button
				class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-white/80 transition-all hover:bg-white/10 active:scale-95 disabled:opacity-30"
				disabled={!game.canUndo || solving}
				onclick={() => game.undo()}
			>
				↩ Undo
			</button>
			<div class="h-5 w-px bg-white/10"></div>
			<button
				class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-white/80 transition-all hover:bg-white/10 active:scale-95 disabled:opacity-30"
				disabled={!game.canRedo || solving}
				onclick={() => game.redo()}
			>
				↪ Redo
			</button>
			<div class="h-5 w-px bg-white/10"></div>
			<button
				class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-white/80 transition-all hover:bg-white/10 active:scale-95"
				onclick={startNewGame}
			>
				+ New
			</button>
		</div>
	</div>
</div>

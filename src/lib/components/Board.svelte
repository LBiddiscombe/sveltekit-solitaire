<script lang="ts">
	import { onMount } from 'svelte';
	import { game, generateDealPlan } from '$lib/state/game.svelte';
	import { animController, type Rect } from '$lib/animations/controller';
	import { animation } from '$lib/config/animation';
	import { cardImageUrl, cardBackUrl } from '$lib/game/card-images';
	import Stock from './Stock.svelte';
	import Waste from './Waste.svelte';
	import Pile from './Pile.svelte';

	let boardEl: HTMLDivElement;
	let solving = $state(false);

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
		queueMicrotask(() => startDeal());
	});

	function pileRect(kind: string, index: number): Rect | null {
		const el = document.querySelector(`[data-pile-kind="${kind}"][data-pile-index="${index}"]`);
		if (!el) return null;
		const r = el.getBoundingClientRect();
		return { x: r.left, y: r.top, width: r.width, height: r.height };
	}

	function pileCascade(kind: string, index: number): { faceup: number; facedown: number } {
		const el = document.querySelector(`[data-pile-kind="${kind}"][data-pile-index="${index}"]`);
		if (!el) return { faceup: 0, facedown: 0 };
		const ch = parseFloat(document.documentElement.style.getPropertyValue('--card-height')) || 200;
		return {
			faceup: parseFloat(el.getAttribute('data-pile-cascade') || '0.15') * ch,
			facedown: parseFloat(el.getAttribute('data-pile-facedown-cascade') || '0.08') * ch
		};
	}

	async function startDeal() {
		game.busy = true;
		const stockEl = document.querySelector('[data-pile-kind="stock"]');
		const stockRect = stockEl
			? stockEl.getBoundingClientRect()
			: { x: 0, y: 0, width: 0, height: 0 };
		const src = {
			x: stockRect.x,
			y: stockRect.y,
			width: stockRect.width,
			height: stockRect.height
		};

		const plan = generateDealPlan();
		const colCounts = [0, 0, 0, 0, 0, 0, 0];

		for (let i = 0; i < plan.length; i++) {
			await new Promise((r) => setTimeout(r, animation.deal.staggerMs));

			const { column, faceUp } = plan[i];
			const dst = pileRect('tableau', column);
			if (!dst) continue;
			const { facedown: facedownPx } = pileCascade('tableau', column);

			const targetY = dst.y + colCounts[column] * facedownPx;
			const target = { x: dst.x, y: targetY, width: dst.width, height: dst.height };

			const card = game.stock[0];
			if (faceUp) {
				await animController.animateFlip(src, target, cardImageUrl(card), {
					durationMs: animation.deal.flightMs,
					easing: animation.deal.easing
				});
			} else {
				await animController.animateStatic(
					src,
					target,
					cardBackUrl(),
					animation.deal.flightMs,
					animation.deal.easing
				);
			}
			game.dealCardToTableau(column, faceUp);
			colCounts[column]++;
		}
		game.busy = false;
	}

	async function startSolve() {
		if (game.busy) return;
		solving = true;

		while (!game.isWon) {
			const move = game.peekSolveMove();
			if (!move) break;

			const { column, foundationIndex } = move;
			const card = game.tableau[column][game.tableau[column].length - 1];

			const src = pileRect('tableau', column);
			if (!src) break;
			const { faceup: cascadePx, facedown: facedownPx } = pileCascade('tableau', column);
			const colCount = game.tableau[column].length;
			const prev = colCount > 1 ? game.tableau[column][colCount - 2] : null;
			const cascade = prev && !prev.faceUp ? facedownPx : cascadePx;
			const srcY = src.y + (colCount - 1) * cascade;
			const srcRect = { x: src.x, y: srcY, width: src.width, height: src.height };

			const dst = pileRect('foundation', foundationIndex);
			if (!dst) break;
			const dstRect = { x: dst.x, y: dst.y, width: dst.width, height: dst.height };

			game.animatingCard = {
				from: { kind: 'tableau', index: column },
				to: { kind: 'foundation', index: foundationIndex },
				suit: card.suit,
				rank: card.rank
			};
			game.solveTickAt(column, foundationIndex);

			await animController.animateStatic(
				srcRect,
				dstRect,
				cardImageUrl(card),
				animation.solve.flightMs,
				animation.solve.easing
			);
			game.animatingCard = null;

			if (game.isWon) break;
			await new Promise((r) => setTimeout(r, animation.solve.pauseMs));
		}

		solving = false;
	}

	$effect(() => {
		return () => {
			animController.dispose();
		};
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
				animController.dispose();
				game.newGame();
				queueMicrotask(() => startDeal());
			}}
		>
			New
		</button>
	</div>
</div>

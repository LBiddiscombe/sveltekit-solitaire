<script lang="ts">
	import { onMount } from 'svelte';
	import { game, persistAfterDeal, simulateStockCycle } from '$lib/state/game.svelte';
	import { animationHost } from '$lib/animations/host.svelte';
	import { preloadCardImages } from '$lib/game/card-images';
	import { getSettings } from '$lib/settings';
	import { tryFindWinnableDeal } from '$lib/game/solver/solve-deal';
	import { searchPath } from '$lib/game/solver/search';
	import type { SolverMove } from '$lib/game/solver/types';
	import type { Card, Suit, Rank } from '$lib/game/types';
	import Stock from './Stock.svelte';
	import Waste from './Waste.svelte';
	import Pile from './Pile.svelte';

	let boardEl: HTMLDivElement;
	let solving = $state(false);
	let ready = $state(false);
	let showNewGameConfirm = $state(false);
	let searchingWinnable = $state(false);
	let debugStepping = $state(false);

	const SUIT_SYMBOLS: Record<Suit, string> = {
		spades: '♠',
		clubs: '♣',
		diamonds: '♦',
		hearts: '♥'
	};

	const RANK_LABELS: Record<Rank, string> = {
		a: 'A',
		'2': '2',
		'3': '3',
		'4': '4',
		'5': '5',
		'6': '6',
		'7': '7',
		'8': '8',
		'9': '9',
		'10': '10',
		j: 'J',
		q: 'Q',
		k: 'K'
	};

	function cardLabel(card: Card): string {
		return `${RANK_LABELS[card.rank]}${SUIT_SYMBOLS[card.suit]}`;
	}

	function formatMoveDescription(move: SolverMove, index: number, total: number): string {
		const prefix = `${index}/${total}`;
		if (move.kind === 'draw') return `${prefix} Draw`;
		if (move.kind === 'recycle') return `${prefix} Recycle`;
		const pile = game.getPile(move.from);
		if (pile && move.cardIndex >= 0 && move.cardIndex < pile.length) {
			const card = pile[move.cardIndex];
			return `${prefix} ${cardLabel(card)} ${pileLabel(move.from)}→${pileLabel(move.to)}`;
		}
		return `${prefix} ${pileLabel(move.from)}→${pileLabel(move.to)}`;
	}

	function pileLabel(ref: { kind: string; index: number }): string {
		if (ref.kind === 'tableau') return `T${ref.index + 1}`;
		if (ref.kind === 'foundation') return `F${ref.index + 1}`;
		if (ref.kind === 'waste') return 'Waste';
		if (ref.kind === 'stock') return 'Stock';
		return '';
	}

	async function runDebugSolver() {
		if (!game.debugMode) return;
		game.solvingInProgress = true;
		debugStepping = false;
		await new Promise((r) => setTimeout(r, 50));
		const result = searchPath(
			{
				stock: game.stock,
				waste: game.waste,
				tableau: game.tableau,
				foundations: game.foundations
			},
			2000
		);
		if (result.status === 'solvable' && result.moves.length > 0) {
			game.loadSolution(result.moves, 'solvable');
			debugStepping = true;
		} else {
			game.loadSolution([], result.status);
		}
		game.solvingInProgress = false;
	}

	async function handleStepForward() {
		if (animationHost.busy || game.solutionIndex >= game.solutionMoves.length) return;
		const move = game.solutionMoves[game.solutionIndex];
		await animationHost.animateSolverMove(move);
	}

	async function handleStepBackward() {
		if (animationHost.busy) return;
		game.stepBackward();
	}

	function handleStepToStart() {
		if (animationHost.busy) return;
		game.stepToStart();
	}

	function handleStepToEnd() {
		if (animationHost.busy) return;
		const doSteps = async () => {
			while (game.solutionIndex < game.solutionMoves.length) {
				const move = game.solutionMoves[game.solutionIndex];
				await animationHost.animateSolverMove(move);
			}
		};
		doSteps();
	}

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
		if (animationHost.busy || solving || searchingWinnable) return;
		showNewGameConfirm = false;
		debugStepping = false;
		animationHost.dispose();

		const settings = getSettings();
		if (settings.onlyWinnable) {
			searchingWinnable = true;
			try {
				const result = await tryFindWinnableDeal();
				if (result) {
					game.newGame(result.seed);
				} else {
					game.newGame();
				}
			} finally {
				searchingWinnable = false;
			}
		} else {
			game.newGame();
		}

		await animationHost.startDeal();
		persistAfterDeal();

		if (game.debugMode) {
			await runDebugSolver();
		}
	}

	async function retrySameDeal() {
		if (animationHost.busy || game.seed === undefined) return;
		showNewGameConfirm = false;
		animationHost.dispose();
		game.newGame(game.seed);
		await animationHost.startDeal();
		persistAfterDeal();
	}

	async function handleNewGameClick() {
		if (animationHost.busy) return;
		if (simulateStockCycle(game)) {
			showNewGameConfirm = true;
			return;
		}
		await startNewGame();
	}

	onMount(() => {
		preloadCardImages();
		try {
			game.debugMode = localStorage.getItem('solitaire-debug') === 'true';
		} catch {
			/* best-effort */
		}
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
					{#if game.seed !== undefined}
						<button
							class="rounded-lg bg-emerald-600 px-6 py-2 text-white hover:bg-emerald-700"
							onclick={retrySameDeal}
						>
							Retry Same Deal
						</button>
					{/if}
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

	{#if searchingWinnable}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div class="rounded-xl bg-white p-8 text-center shadow-2xl">
				<h2 class="mb-4 text-3xl font-bold">Finding Winnable Deal</h2>
				<p class="mx-auto mb-4 max-w-sm text-sm text-gray-600">
					Solving the deal to check if it's winnable&hellip;
				</p>
			</div>
		</div>
	{/if}

	{#if showNewGameConfirm}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div class="rounded-xl bg-white p-8 text-center shadow-2xl">
				<h2 class="mb-4 text-3xl font-bold">Start a New Game?</h2>
				<p class="mx-auto mb-4 max-w-sm text-sm text-gray-600">
					There are still moves available. Any progress in this game will be lost.
				</p>
				<div class="flex justify-center gap-3">
					<button
						class="rounded-lg bg-gray-600 px-6 py-2 text-white hover:bg-gray-700"
						onclick={() => (showNewGameConfirm = false)}
					>
						Cancel
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
		class="fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-2"
		style="touch-action: auto; -webkit-user-select: auto; user-select: auto;"
	>
		{#if game.debugMode}
			<div
				class="flex flex-col items-center gap-0.5 rounded-xl bg-black/30 px-3 py-1.5 shadow-lg shadow-black/10 backdrop-blur-sm"
			>
				{#if game.solvingInProgress}
					<span class="text-xs text-white/70">Solving...</span>
				{:else if game.solutionStatus === 'solvable' && debugStepping && game.solutionMoves.length > 0}
					<span class="text-center text-xs text-white/80">
						{formatMoveDescription(
							game.solutionMoves[game.solutionIndex],
							game.solutionIndex + 1,
							game.solutionMoves.length
						)}
					</span>
				{:else if game.solutionStatus === 'unsolvable'}
					<span class="text-xs text-red-400">Not solvable</span>
				{:else if game.solutionStatus === 'undetermined'}
					<span class="text-xs text-amber-400">Solver timed out</span>
				{:else}
					<span class="text-xs text-white/50">No solution loaded</span>
				{/if}
				<div class="flex flex-nowrap items-center gap-2">
					<span class="text-xs font-semibold tracking-wider text-cyan-300">DEBUG</span>
					{#if game.solutionStatus === 'solvable' && debugStepping && game.solutionMoves.length > 0}
						<div class="h-4 w-px bg-white/20"></div>
						<button
							class="rounded px-1.5 py-0.5 text-xs text-white/70 transition-all hover:bg-white/10 hover:text-white disabled:opacity-20"
							disabled={game.solutionIndex === 0}
							onclick={handleStepToStart}
							title="Go to start">⏮</button
						>
						<button
							class="rounded px-1.5 py-0.5 text-xs text-white/70 transition-all hover:bg-white/10 hover:text-white disabled:opacity-20"
							disabled={game.solutionIndex === 0}
							onclick={handleStepBackward}
							title="Step backward">◀</button
						>
						<button
							class="rounded px-1.5 py-0.5 text-xs text-white/70 transition-all hover:bg-white/10 hover:text-white disabled:opacity-20"
							disabled={game.solutionIndex >= game.solutionMoves.length}
							onclick={handleStepForward}
							title="Step forward">▶</button
						>
						<button
							class="rounded px-1.5 py-0.5 text-xs text-white/70 transition-all hover:bg-white/10 hover:text-white disabled:opacity-20"
							disabled={game.solutionIndex >= game.solutionMoves.length}
							onclick={handleStepToEnd}
							title="Play through to end">⏭</button
						>
					{:else if !game.solvingInProgress && game.solutionStatus !== 'solvable'}
						<button
							class="rounded px-1.5 py-0.5 text-xs text-cyan-300 transition-all hover:bg-white/10"
							onclick={runDebugSolver}
						>
							Find
						</button>
					{/if}
				</div>
			</div>
		{/if}
		<div
			class="flex flex-nowrap items-center rounded-xl bg-black/20 px-1 py-1 shadow-lg shadow-black/10 backdrop-blur-sm"
		>
			<button
				class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-white/80 transition-all hover:bg-white/10 hover:text-amber-300 active:scale-95 disabled:opacity-30"
				disabled={solving || searchingWinnable || debugStepping}
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
						}, 2000);
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
				disabled={!game.canUndo || solving || searchingWinnable || debugStepping}
				onclick={() => game.undo()}
			>
				↩ Undo
			</button>
			<div class="h-5 w-px bg-white/10"></div>
			<button
				class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-white/80 transition-all hover:bg-white/10 active:scale-95 disabled:opacity-30"
				disabled={!game.canRedo || solving || searchingWinnable || debugStepping}
				onclick={() => game.redo()}
			>
				↪ Redo
			</button>
			<div class="h-5 w-px bg-white/10"></div>
			<button
				class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-white/80 transition-all hover:bg-white/10 active:scale-95 disabled:opacity-30"
				disabled={solving || searchingWinnable || debugStepping}
				onclick={handleNewGameClick}
			>
				+ New Game
			</button>
		</div>
	</div>
</div>

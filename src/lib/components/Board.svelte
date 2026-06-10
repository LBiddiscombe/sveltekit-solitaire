<script lang="ts">
	import { onMount } from 'svelte';
	import { game, persistAfterDeal } from '$lib/state/game.svelte';
	import { gameStore } from '$lib/state/game-store.svelte';
	import { getStreaks, recordGame } from '$lib/stats';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { animationHost } from '$lib/animations/host.svelte';
	import { preloadCardImages } from '$lib/game/card-images';
	import { getSettings } from '$lib/settings';
	import { tryFindWinnableDeal, hintSearch } from '$lib/game/solver/solve-deal';
	import { searchPath } from '$lib/game/solver/search';
	import { generateMoves } from '$lib/game/solver/moves';
	import type { SolverMove } from '$lib/game/solver/types';
	import { deepClone, type GameSnapshot } from '$lib/game/snapshot';
	import type { Card, Suit, Rank } from '$lib/game/types';
	import type { Hint } from '$lib/state/game.svelte';
	import Stock from './Stock.svelte';
	import Waste from './Waste.svelte';
	import Pile from './Pile.svelte';
	import WinCelebration from './WinCelebration.svelte';

	let boardEl: HTMLDivElement;
	let solving = $state(false);
	let ready = $state(false);
	let celebrationDone = $state(false);
	let showNewGameConfirm = $state(false);
	let showStuckDialog = $state(false);
	let stuckStatus = $state<string | null>(null);
	let hintToken = 0;
	let searchingWinnable = $state(false);
	let debugStepping = $state(false);
	let debugPlaying = $state(false);
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

	function solverMoveToHint(move: SolverMove): Hint {
		if (move.kind === 'draw') {
			return {
				from: { kind: 'stock', index: 0 },
				fromCardIndex: 0,
				to: { kind: 'waste', index: 0 },
				card: game.stock[0] ?? game.waste[0]
			};
		}
		if (move.kind === 'recycle') {
			return {
				from: { kind: 'stock', index: 0 },
				fromCardIndex: 0,
				to: { kind: 'waste', index: 0 },
				card: game.waste[game.waste.length - 1] ?? game.stock[0]
			};
		}
		const pile = game.getPile(move.from);
		return {
			from: move.from,
			fromCardIndex: move.cardIndex,
			to: move.to,
			card: pile[move.cardIndex]
		};
	}

	function snapshotGame(): GameSnapshot {
		return deepClone({
			stock: game.stock,
			waste: game.waste,
			tableau: game.tableau,
			foundations: game.foundations
		});
	}

	function hasAnyLegalMove(): boolean {
		const snapshot = snapshotGame();
		return generateMoves(snapshot).length > 0 || game.stock.length > 0 || game.waste.length > 0;
	}

	async function runDebugSolver() {
		if (!game.debugMode) return;
		game.solvingInProgress = true;
		debugStepping = false;
		await new Promise((r) => setTimeout(r, 50));
		const result = searchPath(snapshotGame(), 2000);
		if (result.status === 'solvable' && result.moves.length > 0) {
			game.loadSolution(result.moves, 'solvable');
			debugStepping = true;
		} else {
			game.loadSolution([], result.status);
		}
		game.solvingInProgress = false;
	}

	function stopAutoplay() {
		debugPlaying = false;
	}

	async function handleStepForward() {
		if (animationHost.busy || game.solutionIndex >= game.solutionMoves.length) return;
		stopAutoplay();
		const move = game.solutionMoves[game.solutionIndex];
		await animationHost.animateSolverMove(move);
	}

	async function handleStepBackward() {
		if (animationHost.busy) return;
		stopAutoplay();
		game.stepBackward();
	}

	function handleStepToStart() {
		if (animationHost.busy) return;
		stopAutoplay();
		game.stepToStart();
	}

	async function handleStepToEnd() {
		if (animationHost.busy || debugPlaying) return;
		debugPlaying = true;
		while (game.solutionIndex < game.solutionMoves.length && debugPlaying) {
			const move = game.solutionMoves[game.solutionIndex];
			await animationHost.animateSolverMove(move);
		}
		debugPlaying = false;
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
		showStuckDialog = false;
		debugStepping = false;
		debugPlaying = false;
		animationHost.dispose();

		const settings = getSettings();
		const mode = settings.onlyWinnable ? 'winnable' : 'random';
		if (settings.onlyWinnable) {
			searchingWinnable = true;
			try {
				const result = await tryFindWinnableDeal();
				if (result) {
					game.newGame(result.seed, mode);
					game.difficulty = result.difficulty;
				} else {
					game.newGame(undefined, mode);
				}
			} finally {
				searchingWinnable = false;
			}
		} else {
			game.newGame(undefined, mode);
			game.difficulty = null;
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
		showStuckDialog = false;
		animationHost.dispose();

		const foundationCount = game.foundations.reduce((sum, f) => sum + f.length, 0);
		recordGame(game.mode, false, foundationCount, game.moveCount);

		const settings = getSettings();
		const mode = settings.onlyWinnable ? 'winnable' : 'random';
		game.newGame(game.seed, mode);
		await animationHost.startDeal();
		persistAfterDeal();
	}

	async function handleSkipDeal() {
		if (animationHost.busy || searchingWinnable) return;
		await startNewGame();
	}

	async function handleNewGameClick() {
		if (animationHost.busy) return;
		if (hasAnyLegalMove()) {
			showNewGameConfirm = true;
			return;
		}
		const foundationCount = game.foundations.reduce((sum, f) => sum + f.length, 0);
		recordGame(game.mode, false, foundationCount, game.moveCount);
		await startNewGame();
	}

	onMount(() => {
		preloadCardImages();
		try {
			game.debugMode = localStorage.getItem('solitaire-debug') === 'true';
		} catch {
			/* best-effort */
		}
		if (!gameStore.hasSaved) {
			startNewGame();
		}
	});

	async function handleHintClick() {
		if (animationHost.busy || game.hintLoading) return;

		game.hintLoading = true;
		game.clearHint();
		showStuckDialog = false;

		try {
			const result = await hintSearch(snapshotGame(), 500);

			if (result.nextMove) {
				const hint = solverMoveToHint(result.nextMove);
				const token = ++hintToken;
				game.hint = hint;

				if (hint.from.kind === 'stock') {
					setTimeout(() => {
						if (hintToken === token) game.clearHint();
					}, 2000);
				} else {
					await animationHost.showHint(hint);
					game.clearHint();
				}
			} else {
				stuckStatus = result.status;
				showStuckDialog = true;
			}
		} catch {
			stuckStatus = 'undetermined';
			showStuckDialog = true;
		} finally {
			game.hintLoading = false;
		}
	}

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

	$effect(() => {
		if (!game.isWon) {
			celebrationDone = false;
		}
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

	{#if game.isWon && !celebrationDone}
		<WinCelebration ondone={() => (celebrationDone = true)} />
	{/if}

	{#if game.isWon && celebrationDone}
		{@const streaks = getStreaks()}
		{@const nextStreak = streaks.currentStreak + 1}
		{@const bestStreak = Math.max(streaks.bestStreak, nextStreak)}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div class="rounded-xl bg-white p-8 text-center shadow-2xl">
				<h2 class="mb-4 text-3xl font-bold">You Won!</h2>

				<div class="mb-6 flex items-center justify-center gap-4 text-sm">
					<div class="rounded-lg bg-gray-100 px-3 py-1.5">
						<span class="text-gray-500">Streak </span>
						<span class="font-bold text-emerald-600">{nextStreak}</span>
					</div>
					<div class="rounded-lg bg-gray-100 px-3 py-1.5">
						<span class="text-gray-500">Best </span>
						<span class="font-bold text-emerald-600">{bestStreak}</span>
					</div>
				</div>

				<div class="flex items-center justify-center gap-3">
					<button
						class="rounded-lg bg-green-600 px-6 py-2 text-white hover:bg-green-700"
						onclick={() => {
							recordGame(game.mode, true, 52, game.moveCount);
							startNewGame();
						}}
					>
						New Game
					</button>
					<button
						class="rounded-lg bg-gray-600 px-6 py-2 text-white hover:bg-gray-700"
						onclick={() => goto(resolve('/stats'))}
					>
						View Stats
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if showStuckDialog}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div class="rounded-xl bg-white p-8 text-center shadow-2xl">
				<h2 class="mb-4 text-3xl font-bold">No Moves Found</h2>
				<p class="mx-auto mb-4 max-w-sm text-sm text-gray-600">
					{#if stuckStatus === 'unsolvable'}
						The solver has determined this deal is unwinnable from this position.
					{:else}
						The solver couldn't find a next move within its time limit. If you spot a workaround, go
						for it!
					{/if}
				</p>
				<div class="flex justify-center gap-3">
					<button
						class="rounded-lg bg-gray-600 px-6 py-2 text-white hover:bg-gray-700"
						onclick={() => (showStuckDialog = false)}
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
						onclick={() => {
							const fc = game.foundations.reduce((sum, f) => sum + f.length, 0);
							recordGame(game.mode, false, fc, game.moveCount);
							startNewGame();
						}}
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
						onclick={() => {
							const fc = game.foundations.reduce((sum, f) => sum + f.length, 0);
							recordGame(game.mode, false, fc, game.moveCount);
							startNewGame();
						}}
					>
						New Game
					</button>
				</div>
			</div>
		</div>
	{/if}

	<div
		class="fixed bottom-8 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-4"
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
						{#if debugPlaying}
							<button
								class="rounded px-1.5 py-0.5 text-xs text-white/70 transition-all hover:bg-white/10 hover:text-amber-300"
								onclick={stopAutoplay}
								title="Pause autoplay">⏸</button
							>
						{:else}
							<button
								class="rounded px-1.5 py-0.5 text-xs text-white/70 transition-all hover:bg-white/10 hover:text-white disabled:opacity-20"
								disabled={game.solutionIndex >= game.solutionMoves.length}
								onclick={handleStepToEnd}
								title="Play through to end">⏭</button
							>
						{/if}
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
		<div class="flex items-center justify-center gap-3">
			{#if game.difficulty}
				<span
					class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase {game.difficulty ===
					'easy'
						? 'bg-emerald-500/20 text-emerald-400'
						: game.difficulty === 'medium'
							? 'bg-amber-500/20 text-amber-400'
							: 'bg-red-500/20 text-red-400'}"
				>
					{game.difficulty}
				</span>
			{:else if game.mode === 'random'}
				<span
					class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white/60 uppercase"
				>
					Random
				</span>
			{/if}
			{#if game.mode === 'winnable' && game.moveCount === 0 && !searchingWinnable}
				<button
					class="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-white/70 transition-all hover:border-white/40 hover:text-white/90 active:scale-95"
					onclick={handleSkipDeal}
				>
					Skip
				</button>
			{/if}
		</div>
		<div
			class="flex flex-nowrap items-center rounded-xl bg-black/20 px-1 py-1 shadow-lg shadow-black/10 backdrop-blur-sm"
		>
			<button
				class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-white/80 transition-all hover:bg-white/10 hover:text-amber-300 active:scale-95 disabled:opacity-30"
				disabled={solving || searchingWinnable || debugStepping || game.hintLoading}
				onclick={handleHintClick}
			>
				<span class="-mt-0.5 text-2xl leading-none">✦</span>
				{game.hintLoading ? '...' : 'Hint'}
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

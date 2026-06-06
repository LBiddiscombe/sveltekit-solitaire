<script lang="ts">
	import type { Card, PileKind } from '$lib/game/deck';
	import { cssClass } from '$lib/game/deck';
	import { game } from '$lib/state/game.svelte';
	import { draggable, dropZone } from '$lib/actions/dragdrop';

	let {
		cards,
		kind,
		index,
		emptyLabel = '',
		cascade = 30,
		facedownCascade = 15
	}: {
		cards: Card[];
		kind: PileKind;
		index: number;
		emptyLabel?: string;
		cascade?: number;
		facedownCascade?: number;
	} = $props();

	const ref = $derived({ kind, index });

	const isDraggingFromHere = $derived(
		game.dragging !== null && game.dragging.from.kind === kind && game.dragging.from.index === index
	);

	function isBeingDragged(i: number): boolean {
		if (!isDraggingFromHere) return false;
		const d = game.dragging!;
		return i >= d.cardIndex && i < d.cardIndex + d.count;
	}

	function marginStyle(i: number): string {
		if (i === 0) return '0';
		const prev = cards[i - 1];
		const c = prev.faceUp ? cascade : facedownCascade;
		return `calc(${c}px - var(--card-height))`;
	}

	function handleDblClick(cardIndex: number) {
		if (cardIndex !== cards.length - 1) return;
		game.autoMove(ref, cardIndex);
	}
</script>

<div class="flex flex-col items-center" use:dropZone={ref}>
	{#if cards.length === 0}
		<div
			class="h-10 rounded-lg border-2 border-dashed border-gray-400"
			style:width="var(--card-width)"
		>
			{emptyLabel}
		</div>
	{:else}
		{#each cards as card, i (i)}
			<div
				class="relative"
				style:width="var(--card-width)"
				style:margin-top={marginStyle(i)}
				style:z-index={i + 1}
				class:cursor-grab={card.faceUp}
				class:opacity-30={isBeingDragged(i)}
				use:draggable={ref}
				data-card-index={i}
				role="button"
				tabindex={i === cards.length - 1 ? 0 : -1}
				ondblclick={() => handleDblClick(i)}
				onkeydown={(e) => e.key === 'Enter' && handleDblClick(i)}
			>
				<div class={card.faceUp ? cssClass(card) : 'pcard-back'}></div>
			</div>
		{/each}
	{/if}
</div>

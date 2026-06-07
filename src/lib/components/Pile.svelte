<script lang="ts">
	import type { Card, PileKind, PileRef } from '$lib/game/types';
	import { game } from '$lib/state/game.svelte';
	import { dragController } from '$lib/actions/dragdrop';
	import { cardImageUrl, cardBackUrl } from '$lib/game/card-images';

	let {
		cards,
		kind,
		index,
		emptyLabel = '',
		cascade = 0.15,
		facedownCascade = 0.08
	}: {
		cards: Card[];
		kind: PileKind;
		index: number;
		emptyLabel?: string;
		cascade?: number;
		facedownCascade?: number;
	} = $props();

	const ref = $derived<PileRef>({ kind, index });

	const isDraggingFromHere = $derived(
		game.dragging !== null && game.dragging.from.kind === kind && game.dragging.from.index === index
	);

	function isBeingDragged(i: number): boolean {
		if (!isDraggingFromHere) return false;
		const d = game.dragging!;
		return i >= d.cardIndex && i < d.cardIndex + d.count;
	}

	function isAnimatingToHere(card: Card): boolean {
		const a = game.animatingCard;
		if (!a) return false;
		return (
			a.to.kind === kind && a.to.index === index && a.suit === card.suit && a.rank === card.rank
		);
	}

	function marginStyle(i: number): string {
		if (i === 0) return '0';
		const prev = cards[i - 1];
		const c = prev.faceUp ? cascade : facedownCascade;
		return `calc(var(--card-height) * ${c} - var(--card-height))`;
	}
</script>

<div
	class="flex flex-col items-center"
	use:dragController.dropZone={ref}
	data-pile-cascade={cascade}
	data-pile-facedown-cascade={facedownCascade}
>
	{#if cards.length === 0}
		<div
			class="box-border rounded-lg border-2 border-dashed border-gray-400"
			style:width="var(--card-width)"
			style:height="var(--card-height)"
		>
			{emptyLabel}
		</div>
	{:else}
		{#each cards as card, i (`${card.suit}:${card.rank}`)}
			<div
				class="relative"
				style:width="var(--card-width)"
				style:margin-top={marginStyle(i)}
				style:z-index={i + 1}
				style:opacity={isAnimatingToHere(card) ? '0' : isBeingDragged(i) ? '0.3' : '1'}
				class:cursor-grab={card.faceUp}
				use:dragController.draggable={ref}
				data-card-index={i}
				role="button"
				tabindex={i === cards.length - 1 ? 0 : -1}
			>
				<img
					src={card.faceUp ? cardImageUrl(card) : cardBackUrl()}
					alt=""
					class="card-image"
					style:width="var(--card-width)"
					style:height="var(--card-height)"
				/>
			</div>
		{/each}
	{/if}
</div>

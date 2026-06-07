<script lang="ts">
	import type { Card } from '$lib/game/types';
	import { game } from '$lib/state/game.svelte';
	import { dragController } from '$lib/actions/dragdrop';
	import { cardImageUrl, cardBackUrl } from '$lib/game/card-images';

	let { cards }: { cards: Card[] } = $props();

	const ref = { kind: 'waste' as const, index: 0 };

	const topIndex = $derived(cards.length - 1);
	const fanStart = $derived(Math.max(0, cards.length - 3));
	const fanOffset = 15;
</script>

<div class="flex flex-col items-center">
	<div
		class="relative"
		style:width={`calc(var(--card-width) + ${Math.max(0, Math.min(3, cards.length) - 1)} * ${fanOffset}px)`}
		style:height="var(--card-height)"
		use:dragController.dropZone={ref}
	>
		{#each cards as card, i (i)}
			<div
				class="absolute"
				style:left={`${i >= fanStart ? (i - fanStart) * fanOffset : 0}px`}
				style:z-index={i + 1}
				class:opacity-30={game.dragging !== null &&
					game.dragging.from.kind === 'waste' &&
					game.dragging.cardIndex === i}
				data-card-index={i}
				role="button"
				tabindex={i === topIndex ? 0 : -1}
			>
				{#if i === topIndex}
					<img
						src={card.faceUp ? cardImageUrl(card) : cardBackUrl()}
						alt=""
						class="card-image pointer-events-auto"
						style:width="var(--card-width)"
						style:height="var(--card-height)"
						use:dragController.draggable={ref}
					/>
				{:else}
					<img
						src={card.faceUp ? cardImageUrl(card) : cardBackUrl()}
						alt=""
						class="card-image pointer-events-none"
						style:width="var(--card-width)"
						style:height="var(--card-height)"
					/>
				{/if}
			</div>
		{/each}
	</div>
</div>

<script lang="ts">
	import type { Card } from '$lib/game/types';
	import { game } from '$lib/state/game.svelte';
	import { animationHost } from '$lib/animations/host.svelte';
	import { dragController } from '$lib/actions/dragdrop';
	import { cardImageUrl, cardBackUrl } from '$lib/game/card-images';

	let { cards }: { cards: Card[] } = $props();

	const ref = { kind: 'waste' as const, index: 0 };

	const topIndex = $derived(cards.length - 1);
	const fanStart = $derived(Math.max(0, cards.length - 3));
	const fanOffset = 0.5;

	function isAnimatingToHere(card: Card): boolean {
		const a = animationHost.animatingCard;
		if (!a) return false;
		return (
			a.to.kind === 'waste' && a.to.index === 0 && a.suit === card.suit && a.rank === card.rank
		);
	}
</script>

<div class="flex flex-col items-center">
	<div
		class="relative"
		style:width={`calc(var(--card-width) * (1 + ${Math.max(0, Math.min(3, cards.length) - 1)} * ${fanOffset}))`}
		style:height="var(--card-height)"
		use:dragController.dropZone={ref}
	>
		{#each cards as card, i (`${card.suit}:${card.rank}`)}
			<div
				class="absolute"
				style:left={`calc(var(--card-width) * ${i >= fanStart ? (i - fanStart) * fanOffset : 0})`}
				style:z-index={i + 1}
				style:opacity={isAnimatingToHere(card)
					? '0'
					: game.dragging !== null &&
						  game.dragging.from.kind === 'waste' &&
						  game.dragging.cardIndex === i
						? '0.3'
						: '1'}
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

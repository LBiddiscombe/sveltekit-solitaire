<script lang="ts">
	import type { Card } from '$lib/game/deck';
	import { cssClass } from '$lib/game/deck';
	import { game } from '$lib/state/game.svelte';
	import { draggable, dropZone } from '$lib/actions/dragdrop';

	let { cards }: { cards: Card[] } = $props();

	const ref = { kind: 'waste' as const, index: 0 };

	const topIndex = $derived(cards.length - 1);

	function handleDblClick() {
		if (cards.length === 0) return;
		game.autoMove(ref, cards.length - 1);
	}
</script>

<div class="flex flex-col items-center">
	<div
		class="relative"
		style:width="var(--card-width)"
		style:height={cards.length > 0 ? 'var(--card-height)' : '40px'}
		use:dropZone={ref}
	>
		{#if cards.length === 0}
			<div class="absolute inset-0 rounded-lg border-2 border-dashed border-gray-400"></div>
		{:else}
			{#each cards as card, i (i)}
				<div
					class="absolute"
					style:left={`${i < topIndex ? i * 4 : 0}px`}
					style:z-index={i + 1}
					class:opacity-30={game.dragging !== null &&
						game.dragging.from.kind === 'waste' &&
						game.dragging.cardIndex === i}
					data-card-index={i}
					role="button"
					tabindex={i === topIndex ? 0 : -1}
					ondblclick={() => i === topIndex && handleDblClick()}
					onkeydown={(e) => e.key === 'Enter' && i === topIndex && handleDblClick()}
				>
					{#if i === topIndex}
						<div
							class="pointer-events-auto {card.faceUp ? cssClass(card) : 'pcard-back'}"
							use:draggable={ref}
						></div>
					{:else}
						<div class="pointer-events-none {card.faceUp ? cssClass(card) : 'pcard-back'}"></div>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</div>

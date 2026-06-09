<script lang="ts">
	import type { Card } from '$lib/game/types';
	import { game } from '$lib/state/game.svelte';
	import { animationHost } from '$lib/animations/host.svelte';
	import { cardBackUrl } from '$lib/game/card-images';

	let { cards }: { cards: Card[] } = $props();

	const isEmpty = $derived(cards.length === 0 && game.waste.length === 0);
	const isHinted = $derived(game.hint !== null && game.hint.from.kind === 'stock');

	function handleClick() {
		if (animationHost.busy) return;
		animationHost.animateDraw();
	}
</script>

<button
	class="flex items-center justify-center"
	style:width="var(--card-width)"
	onclick={handleClick}
	data-pile-kind="stock"
>
	{#if isEmpty}
		<div
			class="box-border w-full rounded-lg border-2 border-dashed border-gray-400"
			style:height="var(--card-height)"
		></div>
	{:else if cards.length === 0}
		<div
			class="box-border w-full rounded-lg border-2 border-dashed border-gray-300"
			style:height="var(--card-height)"
			title="Click to recycle waste"
		></div>
	{:else}
		<div class="relative" style:width="var(--card-width)" style:height="var(--card-height)">
			<img
				src={cardBackUrl()}
				alt=""
				class="card-image"
				style:width="var(--card-width)"
				style:height="var(--card-height)"
			/>
			{#if isHinted}
				<div class="animate-outline-pulse pointer-events-none absolute inset-0 rounded-lg"></div>
			{/if}
		</div>
	{/if}
</button>

<script lang="ts">
	import type { Card } from '$lib/game/deck';
	import { game } from '$lib/state/game.svelte';

	let { cards }: { cards: Card[] } = $props();

	const isEmpty = $derived(cards.length === 0 && game.waste.length === 0);
</script>

<button
	class="flex items-center justify-center"
	style:width="var(--card-width)"
	onclick={() => game.drawFromStock()}
>
	{#if isEmpty}
		<div class="h-20 w-full rounded-lg border-2 border-dashed border-gray-400"></div>
	{:else if cards.length === 0}
		<div
			class="h-20 w-full rounded-lg border-2 border-dashed border-gray-300"
			title="Click to recycle waste"
		></div>
	{:else}
		<div class="pcard-back"></div>
	{/if}
</button>

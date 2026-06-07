<script lang="ts">
	import { resolveRoute } from '$app/paths';
</script>

<div class="flex min-h-[calc(100dvh-12rem)] items-center justify-center px-4">
	<div class="w-full max-w-md rounded-xl bg-white/5 p-8 backdrop-blur-sm">
		<h1 class="text-2xl font-bold text-white/90">About Solitaire</h1>
		<p class="mt-4 leading-relaxed text-white/50">
			A Klondike Solitaire card game built with SvelteKit. Animated dealing, drag-and-drop,
			auto-move, undo/redo, and solve mode.
		</p>
	</div>
</div>

<div
	class="fixed bottom-4 left-1/2 z-30 -translate-x-1/2"
	style="touch-action: auto; user-select: auto;"
>
	<div
		class="flex items-center rounded-xl bg-black/20 px-1 py-1 shadow-lg shadow-black/10 backdrop-blur-sm"
	>
		<a
			href={resolveRoute('/')}
			class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-white/80 transition-all hover:bg-white/10 active:scale-95"
		>
			← Back to Game
		</a>
	</div>
</div>

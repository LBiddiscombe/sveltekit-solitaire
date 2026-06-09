<script lang="ts">
	import { resolveRoute } from '$app/paths';
</script>

<div class="mx-auto max-w-4xl px-4 py-8">
	<h1 class="mb-8 text-2xl font-bold text-white/90">About Solitaire</h1>

	<div class="space-y-6">
		<!-- Rules -->
		<div class="rounded-xl bg-white/5 p-6 backdrop-blur-sm">
			<h2 class="text-lg font-semibold text-white/90">Klondike Solitaire</h2>
			<h3 class="mt-4 text-sm font-medium text-white/70">Object</h3>
			<p class="mt-1 text-sm leading-relaxed text-white/50">
				Move all 52 cards to the four foundation piles, building each suit from Ace up to King.
			</p>
			<h3 class="mt-4 text-sm font-medium text-white/70">How to Play</h3>
			<ul class="mt-1 space-y-1.5 text-sm leading-relaxed text-white/50">
				<li>
					<strong class="text-white/60">Tableau</strong> — the seven columns in the middle. Build descending
					(King to Ace) and alternating colors. A sequence of face-up cards can be moved together. An
					empty column can only be filled with a King.
				</li>
				<li>
					<strong class="text-white/60">Foundations</strong> — the four piles in the top-left. Build ascending
					(Ace to King) in the same suit. Cards can be moved back to the tableau if needed.
				</li>
				<li>
					<strong class="text-white/60">Stock</strong> — click to draw three cards at a time to the waste
					pile. When empty, click again to recycle.
				</li>
				<li>
					<strong class="text-white/60">Waste</strong> — the top card is playable on the tableau or foundations.
				</li>
				<li>
					<strong class="text-white/60">Hint</strong> — not sure what to do? Tap the hint button to highlight
					your next move.
				</li>
			</ul>
		</div>

		<!-- Features -->
		<div class="rounded-xl bg-white/5 p-6 backdrop-blur-sm">
			<h2 class="text-lg font-semibold text-white/90">Features</h2>
			<ul class="mt-3 list-inside list-disc space-y-1.5 text-sm leading-relaxed text-white/50">
				<li>Animated card dealing with smooth transitions</li>
				<li>Drag-and-drop cards between piles</li>
				<li>Auto-move cards to foundations with a double-click</li>
				<li>Quick-solve mode to finish a won position</li>
				<li>Smart hints that find the next best move</li>
				<li>Undo and redo — go back as far as you like</li>
				<li>Winnable-only mode — the solver pre-checks each deal</li>
				<li>Detailed statistics tracked separately for random and winnable games</li>
				<li>Persistent game state — pick up where you left off</li>
			</ul>
		</div>

		<!-- Credit -->
		<div class="rounded-xl bg-white/5 p-6 backdrop-blur-sm">
			<p class="text-sm leading-relaxed text-white/50">
				Created by <strong class="text-white/60">Lee Biddiscombe</strong>.
				<a
					href="https://github.com/LBiddiscombe/sveltekit-solitaire"
					target="_blank"
					rel="noopener noreferrer"
					class="ml-1 text-emerald-400 underline decoration-emerald-400/30 underline-offset-2 transition-colors hover:decoration-emerald-400"
				>
					View on GitHub
				</a>
			</p>
			<p class="mt-3 text-sm leading-relaxed text-white/50">
				Card graphics purchased from
				<a
					href="https://www.gameart2d.com/playing-card-game-assets-pack.html"
					target="_blank"
					rel="noopener noreferrer"
					class="text-emerald-400 underline decoration-emerald-400/30 underline-offset-2 transition-colors hover:decoration-emerald-400"
				>
					gameart2d.com
				</a>.
			</p>
			<p class="mt-3 text-sm leading-relaxed text-white/40">
				Built with assistance from opencode and Zen models.
			</p>
		</div>
	</div>

	<div class="mt-6 flex justify-center">
		<div
			class="inline-flex items-center rounded-xl bg-black/20 px-1 py-1 shadow-lg shadow-black/10 backdrop-blur-sm"
		>
			<a
				href={resolveRoute('/')}
				class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-white/80 transition-all hover:bg-white/10 active:scale-95"
			>
				← Back to Game
			</a>
		</div>
	</div>
</div>

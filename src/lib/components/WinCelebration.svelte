<script lang="ts">
	import { game } from '$lib/state/game.svelte';
	import { cardImageUrl } from '$lib/game/card-images';
	import type { Card } from '$lib/game/types';

	interface Props {
		ondone: () => void;
	}

	let { ondone }: Props = $props();

	let canvasEl: HTMLCanvasElement;
	let animationStarted = $state(false);

	interface Particle {
		img: HTMLImageElement;
		x: number;
		y: number;
		vx: number;
		vy: number;
		rotation: number;
		rotationSpeed: number;
		startDelay: number;
	}

	$effect(() => {
		if (!canvasEl) return;
		const canvas = canvasEl;

		const tc = { frameId: null as number | null };

		// Gather foundation pile positions from DOM
		const rects: DOMRect[] = [];
		for (let i = 0; i < 4; i++) {
			const el = document.querySelector(
				`[data-pile-kind="foundation"][data-pile-index="${i}"]`
			) as HTMLElement | null;
			if (el) {
				rects.push(el.getBoundingClientRect());
			} else {
				rects.push(new DOMRect(0, 0, 0, 0));
			}
		}

		// Read card dimensions from CSS custom properties
		const rootStyle = getComputedStyle(document.documentElement);
		const cardW = parseFloat(rootStyle.getPropertyValue('--card-width'));
		const cardH = parseFloat(rootStyle.getPropertyValue('--card-height'));
		if (!cardW || !cardH) return;

		// Collect every card from all 4 foundation piles
		type CardEntry = { card: Card; pileIndex: number; posInPile: number };
		const entries: CardEntry[] = [];
		for (let pile = 0; pile < 4; pile++) {
			const foundation = game.foundations[pile];
			for (let pos = 0; pos < foundation.length; pos++) {
				entries.push({ card: foundation[pos], pileIndex: pile, posInPile: pos });
			}
		}
		if (entries.length === 0) return;

		// Pre-load card images
		const images: HTMLImageElement[] = [];
		let loaded = 0;

		function beginAnimation() {
			if (tc.frameId !== null) return;
			animationStarted = true;

			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			const g = canvas.getContext('2d')!;

			// Build particles: each card is a physics particle
			const particles: Particle[] = [];
			for (let i = 0; i < entries.length; i++) {
				const e = entries[i];
				const rect = rects[e.pileIndex];
				// Tiny random offset so cards from the same pile fan out slightly
				const startX = rect.left + (Math.random() - 0.5) * 10;
				const startY = rect.top + (Math.random() - 0.5) * 10;
				// King (pos 12, top of pile) launches first; Ace (pos 0) launches last.
				// All 4 piles launch in parallel: same delay for same posInPile across piles.
				const delay = (12 - e.posInPile) * 60;
				particles.push({
					img: images[i],
					x: startX,
					y: startY,
					vx: (Math.random() - 0.5) * 12,
					vy: -8 - Math.random() * 6,
					rotation: (Math.random() - 0.5) * Math.PI * 2,
					rotationSpeed: (Math.random() - 0.5) * 0.15,
					startDelay: delay
				});
			}

			const startTime = performance.now();
			const FADE_START = 2500;
			const FADE_END = 3500;

			function frame(now: number) {
				const elapsed = now - startTime;

				// Motion-blur trail: fade old canvas content using destination-out composite
				// (canvas stays transparent — game board visible through it)
				g.globalCompositeOperation = 'destination-out';
				g.fillStyle = 'rgba(0, 0, 0, 0.03)';
				g.fillRect(0, 0, canvas.width, canvas.height);
				g.globalCompositeOperation = 'source-over';

				let anyAlive = false;

				for (const p of particles) {
					const age = elapsed - p.startDelay;
					if (age < 0) continue; // not yet launched

					// Simple Euler integration with gravity
					p.vy += 0.25;
					p.x += p.vx;
					p.y += p.vy;
					p.rotation += p.rotationSpeed;

					// Fade out starting at 2500 ms of age
					let alpha = 1;
					if (age > FADE_START) {
						alpha = Math.max(0, 1 - (age - FADE_START) / (FADE_END - FADE_START));
					}
					if (alpha <= 0) continue;
					anyAlive = true;

					// Draw card centred at its position with rotation
					g.save();
					g.globalAlpha = alpha;
					g.translate(p.x + cardW / 2, p.y + cardH / 2);
					g.rotate(p.rotation);
					g.drawImage(p.img, -cardW / 2, -cardH / 2, cardW, cardH);
					g.restore();
				}

				if (anyAlive) {
					tc.frameId = requestAnimationFrame(frame);
				} else {
					ondone();
				}
			}

			tc.frameId = requestAnimationFrame(frame);
		}

		// Kick off image loading
		for (const e of entries) {
			const img = new Image();
			img.onload = () => {
				loaded++;
				if (loaded === entries.length) beginAnimation();
			};
			img.onerror = () => {
				loaded++;
				if (loaded === entries.length) beginAnimation();
			};
			img.src = cardImageUrl(e.card);
			images.push(img);
		}

		return () => {
			if (tc.frameId !== null) {
				cancelAnimationFrame(tc.frameId);
				tc.frameId = null;
			}
		};
	});

	// No overlay — after the animation finishes, ondone() fires
	// and the parent (Board) shows the original win modal.
</script>

<canvas
	bind:this={canvasEl}
	class="fixed inset-0 z-[9990] h-full w-full"
	class:hidden={!animationStarted}
	style="pointer-events: none"
></canvas>

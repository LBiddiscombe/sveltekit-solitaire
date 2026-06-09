import { game, generateDealPlan, type Hint } from '$lib/state/game.svelte';
import { animation } from '$lib/config/animation';
import { cardImageUrl, cardBackUrl } from '$lib/game/card-images';
import type { PileRef, Suit, Rank } from '$lib/game/types';

export type Rect = { x: number; y: number; width: number; height: number };

export interface AnimatingCard {
	from: PileRef;
	to: PileRef;
	suit: Suit;
	rank: Rank;
}

export class AnimationHost {
	private clones: HTMLDivElement[] = [];

	animatingCard = $state<AnimatingCard | null>(null);
	drawAnimation = $state<{ count: number } | null>(null);
	busy = $state(false);

	private createWrapper(): HTMLDivElement {
		const w = document.createElement('div');
		w.style.position = 'fixed';
		w.style.pointerEvents = 'none';
		w.style.zIndex = '1000';
		w.style.width = 'var(--card-width)';
		w.style.height = 'var(--card-height)';
		return w;
	}

	private setPos(el: HTMLElement, r: Rect) {
		el.style.left = `${r.x}px`;
		el.style.top = `${r.y}px`;
	}

	private buildStaticWrapper(imageUrl: string): HTMLDivElement {
		const w = this.createWrapper();
		const img = document.createElement('img');
		img.src = imageUrl;
		img.style.width = '100%';
		img.style.height = '100%';
		w.appendChild(img);
		return w;
	}

	private buildFlipWrapper(faceImageUrl: string, reverse = false): HTMLDivElement {
		const w = this.createWrapper();
		w.style.perspective = '800px';

		const inner = document.createElement('div');
		inner.style.width = '100%';
		inner.style.height = '100%';
		inner.style.transformStyle = 'preserve-3d';

		const front = document.createElement('img');
		front.src = faceImageUrl;
		front.style.position = 'absolute';
		front.style.inset = '0';
		front.style.width = '100%';
		front.style.height = '100%';
		front.style.backfaceVisibility = 'hidden';

		const back = document.createElement('img');
		back.src = cardBackUrl();
		back.style.position = 'absolute';
		back.style.inset = '0';
		back.style.width = '100%';
		back.style.height = '100%';
		back.style.backfaceVisibility = 'hidden';
		back.style.transform = 'rotateY(180deg)';

		inner.appendChild(front);
		inner.appendChild(back);
		w.appendChild(inner);

		inner.style.transform = reverse ? 'rotateY(0deg)' : 'rotateY(180deg)';

		return w;
	}

	private animateStatic(
		from: Rect,
		to: Rect,
		imageUrl: string,
		durationMs = 250,
		easing = 'ease-out'
	): Promise<void> {
		return new Promise((resolve) => {
			const w = this.buildStaticWrapper(imageUrl);
			this.setPos(w, from);
			document.body.appendChild(w);
			this.clones.push(w);

			requestAnimationFrame(() => {
				w.style.transition = `left ${durationMs}ms ${easing}, top ${durationMs}ms ${easing}`;
				this.setPos(w, to);

				const onEnd = () => {
					w.removeEventListener('transitionend', onEnd);
					this.cleanup(w);
					resolve();
				};
				w.addEventListener('transitionend', onEnd);
				this.fallbackTimer(w, durationMs, resolve, onEnd);
			});
		});
	}

	private animateFlip(
		from: Rect,
		to: Rect,
		faceImageUrl: string,
		opts?: { reverse?: boolean; durationMs?: number; easing?: string }
	): Promise<void> {
		const durationMs = opts?.durationMs ?? 250;
		const easing = opts?.easing ?? 'ease-out';
		const reverse = opts?.reverse ?? false;

		return new Promise((resolve) => {
			const w = this.buildFlipWrapper(faceImageUrl, reverse);
			this.setPos(w, from);
			document.body.appendChild(w);
			this.clones.push(w);

			const inner = w.firstElementChild as HTMLElement;

			requestAnimationFrame(() => {
				w.style.transition = `left ${durationMs}ms ${easing}, top ${durationMs}ms ${easing}`;
				inner.style.transition = `transform ${durationMs}ms ${easing}`;
				inner.style.transform = reverse ? 'rotateY(180deg)' : 'rotateY(360deg)';
				this.setPos(w, to);

				const onEnd = () => {
					w.removeEventListener('transitionend', onEnd);
					this.cleanup(w);
					resolve();
				};
				w.addEventListener('transitionend', onEnd);
				this.fallbackTimer(w, durationMs, resolve, onEnd);
			});
		});
	}

	flyBack(
		clone: HTMLElement,
		target: Rect,
		durationMs = animation.dragFlyBack.flightMs,
		easing = animation.dragFlyBack.easing
	): Promise<void> {
		return new Promise((resolve) => {
			clone.style.transition = `left ${durationMs}ms ${easing}, top ${durationMs}ms ${easing}`;
			clone.style.left = `${target.x}px`;
			clone.style.top = `${target.y}px`;

			const onEnd = () => {
				clone.removeEventListener('transitionend', onEnd);
				this.removeClone(clone);
				resolve();
			};
			clone.addEventListener('transitionend', onEnd);
			this.fallbackTimer(clone, durationMs, resolve, onEnd);
		});
	}

	private fallbackTimer(
		el: HTMLElement,
		durationMs: number,
		resolve: () => void,
		onEnd: () => void
	) {
		setTimeout(() => {
			if (el.isConnected) {
				el.removeEventListener('transitionend', onEnd);
				this.cleanup(el);
				resolve();
			}
		}, durationMs + 50);
	}

	private cleanup(el: HTMLElement) {
		this.clones = this.clones.filter((c) => c !== el);
		el.remove();
	}

	// ── Public API ──

	createDragClone(imageUrl: string, width: number, height: number): HTMLDivElement {
		const w = this.createWrapper();
		w.style.width = `${width}px`;
		w.style.height = `${height}px`;
		const img = document.createElement('img');
		img.src = imageUrl;
		img.style.width = '100%';
		img.style.height = '100%';
		w.appendChild(img);
		document.body.appendChild(w);
		this.clones.push(w);
		return w;
	}

	removeClone(clone: HTMLElement) {
		this.cleanup(clone);
	}

	async animateAutoMove(ref: PileRef, cardIndex: number, srcRect: Rect): Promise<void> {
		const dest = game.findAutoMoveDestination(ref, cardIndex);
		if (!dest) return;

		const dstRect = this.pileRect(dest);
		if (!dstRect) return;

		const pile = game.getPile(ref);
		const card = pile[cardIndex];
		if (!card) return;

		this.animatingCard = {
			from: ref,
			to: dest,
			suit: card.suit,
			rank: card.rank
		};

		const dstPile = game.getPile(dest);
		const dstCount = dstPile?.length ?? 0;

		const ch = parseFloat(document.documentElement.style.getPropertyValue('--card-height')) || 200;
		const cascadeFrac = this.pileCascade(dest);
		const targetRect = this.cardTargetRect(dstRect, dest, dstCount, ch, cascadeFrac);

		game.beginMove();
		game.autoMove(ref, cardIndex);

		await this.animateStatic(
			srcRect,
			targetRect,
			cardImageUrl(card),
			animation.autoMove.flightMs,
			animation.autoMove.easing
		);
		this.animatingCard = null;
	}

	async startDeal(): Promise<void> {
		this.busy = true;

		const stockEl = document.querySelector('[data-pile-kind="stock"]');
		const stockRect = stockEl
			? stockEl.getBoundingClientRect()
			: { x: 0, y: 0, width: 0, height: 0 };
		const src = {
			x: stockRect.x,
			y: stockRect.y,
			width: stockRect.width,
			height: stockRect.height
		};

		const plan = generateDealPlan();
		const colCounts = [0, 0, 0, 0, 0, 0, 0];
		const colRects: (Rect | null)[] = [null, null, null, null, null, null, null];

		for (let i = 0; i < plan.length; i++) {
			await new Promise((r) => setTimeout(r, animation.deal.staggerMs));

			const { column, faceUp } = plan[i];

			if (!colRects[column]) {
				const el = document.querySelector(
					`[data-pile-kind="tableau"][data-pile-index="${column}"]`
				);
				colRects[column] = el ? el.getBoundingClientRect() : null;
			}
			const dst = colRects[column];
			if (!dst) continue;

			const ch =
				parseFloat(document.documentElement.style.getPropertyValue('--card-height')) || 200;
			const targetY = dst.y + colCounts[column] * (animation.deal.flightMs > 0 ? ch * 0.08 : 0);

			const target = { x: dst.x, y: targetY, width: dst.width, height: dst.height };

			const card = game.stock[0];
			if (faceUp) {
				await this.animateFlip(src, target, cardImageUrl(card), {
					durationMs: animation.deal.flightMs,
					easing: animation.deal.easing
				});
			} else {
				await this.animateStatic(
					src,
					target,
					cardBackUrl(),
					animation.deal.flightMs,
					animation.deal.easing
				);
			}
			game.dealCardToTableau(column, faceUp);
			colCounts[column]++;
		}
		this.busy = false;
	}

	async startSolve(): Promise<void> {
		this.busy = true;

		while (!game.isWon) {
			const move = game.peekSolveMove();
			if (!move) break;

			const { column, foundationIndex } = move;
			const col = game.tableau[column];
			const card = col[col.length - 1];

			const srcRect = this.pileRect({ kind: 'tableau', index: column });
			if (!srcRect) break;

			const ch =
				parseFloat(document.documentElement.style.getPropertyValue('--card-height')) || 200;
			const cascadeFrac = this.pileCascade({ kind: 'tableau', index: column });
			const facedownCascadeFrac = this.pileFacedownCascade({ kind: 'tableau', index: column });
			const prev = col.length > 1 ? col[col.length - 2] : null;
			const colCount = col.length;
			const yOffset = prev && !prev.faceUp ? facedownCascadeFrac * ch : cascadeFrac * ch;
			const srcCardRect: Rect = {
				x: srcRect.x,
				y: srcRect.y + (colCount - 1) * yOffset,
				width: srcRect.width,
				height: srcRect.height
			};

			const dstRect = this.pileRect({ kind: 'foundation', index: foundationIndex });
			if (!dstRect) break;
			const targetRect: Rect = {
				x: dstRect.x,
				y: dstRect.y,
				width: dstRect.width,
				height: dstRect.height
			};

			this.animatingCard = {
				from: { kind: 'tableau', index: column },
				to: { kind: 'foundation', index: foundationIndex },
				suit: card.suit,
				rank: card.rank
			};
			game.solveTickAt(column, foundationIndex);

			await this.animateStatic(
				srcCardRect,
				targetRect,
				cardImageUrl(card),
				animation.solve.flightMs,
				animation.solve.easing
			);
			this.animatingCard = null;

			if (game.isWon) break;
			await new Promise((r) => setTimeout(r, animation.solve.pauseMs));
		}

		this.busy = false;
	}

	async animateDraw(): Promise<void> {
		if (game.stock.length === 0) {
			game.drawFromStock();
			return;
		}

		this.busy = true;

		const stockEl = document.querySelector('[data-pile-kind="stock"]');
		if (!stockEl) {
			game.drawFromStock();
			this.busy = false;
			return;
		}
		const src = stockEl.getBoundingClientRect();
		const srcRect: Rect = { x: src.left, y: src.top, width: src.width, height: src.height };

		const wasteEl = document.querySelector('[data-pile-kind="waste"]');
		if (!wasteEl) {
			game.drawFromStock();
			this.busy = false;
			return;
		}
		const wasteRect = wasteEl.getBoundingClientRect();

		const count = Math.min(3, game.stock.length);

		const cw =
			parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-width')) ||
			240;
		const ch =
			parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-height')) ||
			200;

		const drawnCardUrls: string[] = [];
		for (let i = 0; i < count; i++) {
			drawnCardUrls.push(cardImageUrl(game.stock[i]));
		}

		this.drawAnimation = { count };
		game.drawFromStock();

		const newLength = game.waste.length;
		const fanStart = Math.max(0, newLength - 3);

		const promises: Promise<void>[] = [];
		for (let i = 0; i < count; i++) {
			const idx = newLength - count + i;
			const xOffset = idx >= fanStart ? (idx - fanStart) * 0.5 * cw : 0;

			const targetRect: Rect = {
				x: wasteRect.x + xOffset,
				y: wasteRect.y,
				width: cw,
				height: ch
			};

			const delayed =
				animation.draw.staggerMs > 0 && i > 0
					? new Promise<void>((r) => setTimeout(r, i * animation.draw.staggerMs))
					: Promise.resolve();

			promises.push(
				delayed.then(() =>
					this.animateFlip(srcRect, targetRect, drawnCardUrls[i], {
						durationMs: animation.draw.flightMs,
						easing: animation.draw.easing
					})
				)
			);
		}

		await Promise.all(promises);

		this.drawAnimation = null;
		this.busy = false;
	}

	private pileRect(ref: PileRef): Rect | null {
		const el = document.querySelector(
			`[data-pile-kind="${ref.kind}"][data-pile-index="${ref.index}"]`
		);
		if (!el) return null;
		const r = el.getBoundingClientRect();
		return { x: r.left, y: r.top, width: r.width, height: r.height };
	}

	private pileCascade(ref: PileRef): number {
		const el = document.querySelector(
			`[data-pile-kind="${ref.kind}"][data-pile-index="${ref.index}"]`
		);
		if (!el) return 0.15;
		return parseFloat(el.getAttribute('data-pile-cascade') ?? '0.15');
	}

	private pileFacedownCascade(ref: PileRef): number {
		const el = document.querySelector(
			`[data-pile-kind="${ref.kind}"][data-pile-index="${ref.index}"]`
		);
		if (!el) return 0.08;
		return parseFloat(el.getAttribute('data-pile-facedown-cascade') ?? '0.08');
	}

	cardRectInPile(ref: PileRef, cardIndex: number): Rect | null {
		const pileRect = this.pileRect(ref);
		if (!pileRect) return null;
		const pile = game.getPile(ref);
		if (cardIndex < 0 || cardIndex >= pile.length) return null;

		let xOffset = 0;
		let yOffset = 0;
		if (ref.kind === 'tableau') {
			const ch =
				parseFloat(document.documentElement.style.getPropertyValue('--card-height')) || 200;
			const cascadeFrac = this.pileCascade(ref);
			const facedownCascadeFrac = this.pileFacedownCascade(ref);
			for (let j = 0; j < cardIndex; j++) {
				yOffset += pile[j].faceUp ? cascadeFrac * ch : facedownCascadeFrac * ch;
			}
		} else if (ref.kind === 'waste') {
			const cw = parseFloat(document.documentElement.style.getPropertyValue('--card-width')) || 240;
			const fanStart = Math.max(0, pile.length - 3);
			xOffset = cardIndex >= fanStart ? (cardIndex - fanStart) * 0.5 * cw : 0;
		}

		return {
			x: pileRect.x + xOffset,
			y: pileRect.y + yOffset,
			width: pileRect.width,
			height: pileRect.height
		};
	}

	async showHint(hint: Hint): Promise<void> {
		const srcRect = this.cardRectInPile(hint.from, hint.fromCardIndex);
		if (!srcRect) return;

		const dstRect = this.pileRect(hint.to);
		if (!dstRect) return;

		const dstPile = game.getPile(hint.to);
		const dstCount = dstPile?.length ?? 0;
		const ch = parseFloat(document.documentElement.style.getPropertyValue('--card-height')) || 200;
		const cascadeFrac = this.pileCascade(hint.to);
		const targetRect = this.cardTargetRect(dstRect, hint.to, dstCount, ch, cascadeFrac);

		return new Promise((resolve) => {
			const w = this.buildStaticWrapper(cardImageUrl(hint.card));
			w.style.opacity = '0.75';
			w.style.transition = 'none';
			this.setPos(w, srcRect);
			document.body.appendChild(w);
			this.clones.push(w);

			requestAnimationFrame(() => {
				w.style.transition = `left ${animation.hint.flightMs}ms ${animation.hint.easing}, top ${animation.hint.flightMs}ms ${animation.hint.easing}`;
				this.setPos(w, targetRect);

				const onEnd = () => {
					w.removeEventListener('transitionend', onEnd);
					this.cleanup(w);
					resolve();
				};
				w.addEventListener('transitionend', onEnd);
				this.fallbackTimer(w, animation.hint.flightMs, resolve, onEnd);
			});
		});
	}

	private cardTargetRect(
		pileRect: Rect,
		dest: PileRef,
		dstCount: number,
		cardHeight: number,
		cascadeFrac: number
	): Rect {
		let yOffset = 0;
		if (dest.kind === 'tableau') {
			const dstPile = game.getPile(dest);
			const facedownCascadeFrac = this.pileFacedownCascade(dest);
			if (dstPile) {
				for (let j = 0; j < dstCount; j++) {
					yOffset += dstPile[j].faceUp
						? cascadeFrac * cardHeight
						: facedownCascadeFrac * cardHeight;
				}
			}
		}
		return {
			x: pileRect.x,
			y: pileRect.y + yOffset,
			width: pileRect.width,
			height: pileRect.height
		};
	}

	dispose() {
		for (const c of this.clones) {
			c.remove();
		}
		this.clones = [];
	}
}

export const animationHost = new AnimationHost();

import { animation } from '$lib/config/animation';
import { cardBackUrl } from '$lib/game/card-images';

export type Rect = { x: number; y: number; width: number; height: number };

export function rect(el: Element): Rect {
	const r = el.getBoundingClientRect();
	return { x: r.left, y: r.top, width: r.width, height: r.height };
}

export class AnimationController {
	private clones: HTMLDivElement[] = [];

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

	private buildStaticWrapper(imageUrl: string): HTMLDivElement {
		const w = this.createWrapper();
		const img = document.createElement('img');
		img.src = imageUrl;
		img.style.width = '100%';
		img.style.height = '100%';
		w.appendChild(img);
		return w;
	}

	animateStatic(
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

	animateFlip(
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

	async flyBack(
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
				clone.remove();
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

	dispose() {
		for (const c of this.clones) {
			c.remove();
		}
		this.clones = [];
	}
}

export const animController = new AnimationController();

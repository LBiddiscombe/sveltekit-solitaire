import type { PileRef } from '$lib/game/types';
import { game } from '$lib/state/game.svelte';
import { animationHost, type Rect } from '$lib/animations/host.svelte';

export interface DragGame {
	startDrag(ref: PileRef, cardIndex: number): void;
	endDrag(to: PileRef): boolean;
	cancelDrag(): void;
	dragging: { from: PileRef; cardIndex: number; count: number } | null;
}

export class DragController {
	private clone: HTMLElement | null = null;
	private sourceRect: Rect | null = null;

	constructor(private game: DragGame) {}

	findDropTarget(x: number, y: number): PileRef | null {
		const elements = document.elementsFromPoint(x, y);
		for (const el of elements) {
			const htmlEl = el as HTMLElement;
			if (htmlEl.dataset.pileKind && htmlEl.dataset.pileIndex !== undefined) {
				return {
					kind: htmlEl.dataset.pileKind as PileRef['kind'],
					index: parseInt(htmlEl.dataset.pileIndex, 10)
				};
			}
			const parent = htmlEl.closest('[data-pile-kind]') as HTMLElement | null;
			if (parent && parent.dataset.pileIndex !== undefined) {
				return {
					kind: parent.dataset.pileKind as PileRef['kind'],
					index: parseInt(parent.dataset.pileIndex, 10)
				};
			}
		}
		return null;
	}

	private cardRect(cardEl: HTMLElement): Rect | null {
		const r = cardEl.getBoundingClientRect();
		return { x: r.left, y: r.top, width: r.width, height: r.height };
	}

	draggable = (node: HTMLElement, ref: PileRef) => {
		const onPointerDown = (e: PointerEvent) => {
			if (e.button !== 0) return;
			if (this.game.dragging) return;
			if (animationHost.busy) return;

			const cardEl = (e.target as HTMLElement).closest('[data-card-index]') as HTMLElement | null;
			if (!cardEl) return;
			const cardIndex = parseInt(cardEl.dataset.cardIndex!, 10);

			e.preventDefault();
			e.stopPropagation();

			cardEl.style.transition = 'transform 0.12s ease, box-shadow 0.12s ease';
			cardEl.style.transform = 'translateY(-3px)';
			cardEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';

			const rect = cardEl.getBoundingClientRect();
			const startX = e.clientX;
			const startY = e.clientY;
			let hasMoved = false;

			const onPointerMove = (e: PointerEvent) => {
				if (!hasMoved) {
					const dx = e.clientX - startX;
					const dy = e.clientY - startY;
					if (dx * dx + dy * dy <= 25) return;
					this.game.startDrag(ref, cardIndex);
					if (!this.game.dragging) {
						cleanup();
						return;
					}
					hasMoved = true;
					this.sourceRect = this.cardRect(cardEl);

					const imgEl = cardEl.querySelector('img');
					const imgUrl = imgEl?.src ?? '';
					this.clone = animationHost.createDragClone(imgUrl, rect.width, rect.height);
					this.clone.style.left = `${e.clientX - rect.width / 2}px`;
					this.clone.style.top = `${e.clientY - rect.height / 2}px`;
					this.clone.style.transform = 'rotate(3deg)';
					cardEl.style.transform = '';
					cardEl.style.boxShadow = '';
					cardEl.style.opacity = '0.3';
				}
				if (this.clone) {
					this.clone.style.left = `${e.clientX - rect.width / 2}px`;
					this.clone.style.top = `${e.clientY - rect.height / 2}px`;
				}
			};

			const onPointerUp = async (e: PointerEvent) => {
				if (!hasMoved) {
					cleanup();
					const srcRect = this.cardRect(cardEl);
					if (srcRect) {
						await animationHost.animateAutoMove(ref, cardIndex, srcRect);
					}
				} else {
					const target = this.findDropTarget(e.clientX, e.clientY);
					if (target) {
						const valid = this.game.endDrag(target);
						if (!valid && this.clone && this.sourceRect) {
							await animationHost.flyBack(this.clone, this.sourceRect);
							this.clone = null;
							this.sourceRect = null;
						}
					} else {
						if (this.clone && this.sourceRect) {
							await animationHost.flyBack(this.clone, this.sourceRect);
							this.clone = null;
							this.sourceRect = null;
						}
						this.game.cancelDrag();
					}
					cleanup();
				}
			};

			const onKeyDown = (e: KeyboardEvent) => {
				if (e.key === 'Escape') {
					cleanup();
					this.game.cancelDrag();
				}
			};

			const cleanup = () => {
				document.removeEventListener('pointermove', onPointerMove);
				document.removeEventListener('pointerup', onPointerUp);
				document.removeEventListener('keydown', onKeyDown);
				if (this.clone) {
					animationHost.removeClone(this.clone);
					this.clone = null;
				}
				this.sourceRect = null;
				cardEl!.style.transition = '';
				cardEl!.style.transform = '';
				cardEl!.style.boxShadow = '';
				cardEl!.style.opacity = '';
			};

			document.addEventListener('pointermove', onPointerMove);
			document.addEventListener('pointerup', onPointerUp);
			document.addEventListener('keydown', onKeyDown);
		};

		node.addEventListener('pointerdown', onPointerDown);

		return {
			destroy() {
				node.removeEventListener('pointerdown', onPointerDown);
			}
		};
	};

	dropZone = (node: HTMLElement, ref: PileRef) => {
		node.dataset.pileKind = ref.kind;
		node.dataset.pileIndex = String(ref.index);

		return {
			update(newRef: PileRef) {
				node.dataset.pileKind = newRef.kind;
				node.dataset.pileIndex = String(newRef.index);
			},
			destroy() {
				delete node.dataset.pileKind;
				delete node.dataset.pileIndex;
			}
		};
	};
}

export const dragController = new DragController(game as DragGame);

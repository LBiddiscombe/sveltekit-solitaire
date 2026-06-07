import type { PileRef } from '$lib/game/types';
import { game } from '$lib/state/game.svelte';

export interface DragGame {
	startDrag(ref: PileRef, cardIndex: number): void;
	endDrag(to: PileRef): boolean;
	cancelDrag(): void;
	autoMove(ref: PileRef, cardIndex: number): boolean;
	dragging: { from: PileRef; cardIndex: number; count: number } | null;
}

export class DragController {
	private clone: HTMLElement | null = null;

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

	draggable = (node: HTMLElement, ref: PileRef) => {
		const onPointerDown = (e: PointerEvent) => {
			if (e.button !== 0) return;
			if (this.game.dragging) return;

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
					this.clone = cardEl.cloneNode(true) as HTMLElement;
					this.clone.style.margin = '0';
					this.clone.style.position = 'fixed';
					this.clone.style.pointerEvents = 'none';
					this.clone.style.zIndex = '1000';
					this.clone.style.left = `${e.clientX - rect.width / 2}px`;
					this.clone.style.top = `${e.clientY - rect.height / 2}px`;
					this.clone.style.width = `${rect.width}px`;
					this.clone.style.transform = 'rotate(3deg)';
					document.body.appendChild(this.clone);
					cardEl.style.transform = '';
					cardEl.style.boxShadow = '';
					cardEl.style.opacity = '0.3';
				}
				if (this.clone) {
					this.clone.style.left = `${e.clientX - rect.width / 2}px`;
					this.clone.style.top = `${e.clientY - rect.height / 2}px`;
				}
			};

			const onPointerUp = (e: PointerEvent) => {
				cleanup();
				if (!hasMoved) {
					this.game.autoMove(ref, cardIndex);
				} else {
					const target = this.findDropTarget(e.clientX, e.clientY);
					if (target) {
						this.game.endDrag(target);
					} else {
						this.game.cancelDrag();
					}
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
					this.clone.remove();
					this.clone = null;
				}
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

export const dragController = new DragController(game);

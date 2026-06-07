import { game } from '$lib/state/game.svelte';
import type { PileRef } from '$lib/game/deck';

let clone: HTMLElement | null = null;

export function draggable(node: HTMLElement, ref: PileRef) {
	function onPointerDown(e: PointerEvent) {
		if (e.button !== 0) return;
		if (game.dragging) return;

		const cardEl = (e.target as HTMLElement).closest('[data-card-index]') as HTMLElement | null;
		if (!cardEl) return;
		const cardIndex = parseInt(cardEl.dataset.cardIndex!, 10);

		game.startDrag(ref, cardIndex);
		if (!game.dragging) return;

		e.preventDefault();
		e.stopPropagation();

		const rect = cardEl.getBoundingClientRect();
		const startX = e.clientX;
		const startY = e.clientY;
		let hasMoved = false;

		clone = cardEl.cloneNode(true) as HTMLElement;
		clone.style.margin = '0';
		clone.style.position = 'fixed';
		clone.style.pointerEvents = 'none';
		clone.style.zIndex = '1000';
		clone.style.left = `${e.clientX - rect.width / 2}px`;
		clone.style.top = `${e.clientY - rect.height / 2}px`;
		clone.style.width = `${rect.width}px`;
		clone.style.transform = 'rotate(3deg)';
		document.body.appendChild(clone);

		cardEl.style.opacity = '0.3';

		function onPointerMove(e: PointerEvent) {
			if (!clone) return;
			const dx = e.clientX - startX;
			const dy = e.clientY - startY;
			if (dx * dx + dy * dy > 25) {
				hasMoved = true;
			}
			clone.style.left = `${e.clientX - rect.width / 2}px`;
			clone.style.top = `${e.clientY - rect.height / 2}px`;
		}

		function onPointerUp(e: PointerEvent) {
			cleanup();
			if (!hasMoved) {
				game.cancelDrag();
				game.autoMove(ref, cardIndex);
			} else {
				const target = findDropTarget(e.clientX, e.clientY);
				if (target) {
					game.endDrag(target);
				} else {
					game.cancelDrag();
				}
			}
		}

		function onKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				cleanup();
				game.cancelDrag();
			}
		}

		function cleanup() {
			document.removeEventListener('pointermove', onPointerMove);
			document.removeEventListener('pointerup', onPointerUp);
			document.removeEventListener('keydown', onKeyDown);
			if (clone) {
				clone.remove();
				clone = null;
			}
			cardEl!.style.opacity = '';
		}

		document.addEventListener('pointermove', onPointerMove);
		document.addEventListener('pointerup', onPointerUp);
		document.addEventListener('keydown', onKeyDown);
	}

	node.addEventListener('pointerdown', onPointerDown);

	return {
		destroy() {
			node.removeEventListener('pointerdown', onPointerDown);
		}
	};
}

export function dropZone(node: HTMLElement, ref: PileRef) {
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
}

function findDropTarget(x: number, y: number): PileRef | null {
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

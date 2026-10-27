import { useCallback, type RefObject } from "react";

/** Phone layouts, including phones rotated to landscape. */
export const COMPACT_LAYOUT_QUERY = "(max-width: 640px), (max-height: 500px) and (max-width: 960px)";

export function isCompactLayout(): boolean {
	return typeof window !== "undefined" && !!window.matchMedia?.(COMPACT_LAYOUT_QUERY).matches;
}
let keyboardIntent = false;

export function installFocusIntent(target: Document = document): () => void {
	const keyboard = () => { keyboardIntent = true; };
	const pointer = () => { keyboardIntent = false; };
	target.addEventListener("keydown", keyboard, true);
	target.addEventListener("pointerdown", pointer, true);
	return () => {
		target.removeEventListener("keydown", keyboard, true);
		target.removeEventListener("pointerdown", pointer, true);
		keyboardIntent = false;
	};
}

/** Explicit taps and keyboard navigation retain normal browser focus. */
export function allowAutomaticTextFocus(): boolean {
	return keyboardIntent || typeof window === "undefined" || !window.matchMedia?.("(pointer: coarse)").matches;
}

export function focusAutomatically(element: HTMLElement | null | undefined): void {
	if (allowAutomaticTextFocus()) element?.focus({ preventScroll: true });
}

/** A ref callback runs only on the client. Unlike an autofocus attribute,
 * it cannot focus a phone field in server HTML before hydration. */
export function useAutomaticFocusRef<T extends HTMLElement>(existing?: RefObject<T | null>, enabled = true) {
	return useCallback((element: T | null) => {
		if (existing) existing.current = element;
		if (enabled) focusAutomatically(element);
	}, [existing, enabled]);
}

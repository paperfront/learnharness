export interface ViewportGeometry { height: number; top: number }

/** visualViewport already excludes an overlaid keyboard. Native WebView
 * resizing also works: never subtract a second keyboard height. */
export function viewportGeometry(height: number, top: number): ViewportGeometry {
	return { height: Math.max(0, height), top: Math.max(0, top) };
}

export function installMobileViewport(win: Window = window): () => void {
	const root = win.document.documentElement;
	const viewport = win.visualViewport;
	let frame = 0;
	const measure = () => {
		frame = 0;
		// Relayout during pinch zoom fights the user and looks like a keyboard.
		if (viewport && Math.abs(viewport.scale - 1) > 0.02) return;
		const geometry = viewportGeometry(viewport?.height ?? win.innerHeight, viewport?.offsetTop ?? 0);
		root.style.setProperty("--lh-viewport-height", `${geometry.height}px`);
		root.style.setProperty("--lh-viewport-top", `${geometry.top}px`);
	};
	const schedule = () => { if (!frame) frame = win.requestAnimationFrame(measure); };
	const events = ["resize", "orientationchange", "pageshow"] as const;
	events.forEach(event => win.addEventListener(event, schedule));
	viewport?.addEventListener("resize", schedule);
	viewport?.addEventListener("scroll", schedule);
	root.classList.add("lh-mobile");
	measure();
	return () => {
		if (frame) win.cancelAnimationFrame(frame);
		events.forEach(event => win.removeEventListener(event, schedule));
		viewport?.removeEventListener("resize", schedule);
		viewport?.removeEventListener("scroll", schedule);
		root.classList.remove("lh-mobile");
		root.style.removeProperty("--lh-viewport-height");
		root.style.removeProperty("--lh-viewport-top");
	};
}

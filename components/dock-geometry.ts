/** The allowance belongs to the whole panel, not just its question prose.
 * All sibling controls and padding have to fit in the same column too. */
export function dockShellAllowance(columnHeight: number, blockHeight: number, shellHeight: number): number {
	return Math.max(0, columnHeight - Math.max(0, blockHeight - shellHeight) - 8);
}

/** Intentionally reveal the latest transcript above the retained spacer;
 * folding alone leaves a tall pending question's blank reserve onscreen. */
export function historyScrollTop(scrollHeight: number, columnHeight: number, reserve: number, clearance = 160): number {
	return Math.max(0, scrollHeight - reserve - columnHeight + clearance);
}

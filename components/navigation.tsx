"use client";
import { createContext, useContext, type AnchorHTMLAttributes, type ReactNode } from "react";
export interface Navigation { pathname: string; push(href: string, options?: {scroll?: boolean}): void; }
const Context = createContext<Navigation | null>(null);
export function NavigationProvider({ value, children }: { value: Navigation; children: ReactNode }) { return <Context.Provider value={value}>{children}</Context.Provider>; }
export function useRouter(): Navigation { const value = useContext(Context); if (!value) throw new Error("NavigationProvider is required"); return value; }
export function usePathname() { return useRouter().pathname; }
export default function Link({ href, onClick, scroll, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; scroll?: boolean }) {
 const router = useRouter();
 return <a {...props} href={href} onClick={(event) => { onClick?.(event); if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !props.target && !props.download && href.startsWith("/") && !href.startsWith("//")) { event.preventDefault(); router.push(href, {scroll}); } }} />;
}

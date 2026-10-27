"use client";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { NavigationProvider } from "./navigation";
export function NextNavigationProvider({ children }: { children: ReactNode }) { const router = useRouter(); const pathname = usePathname(); const value = useMemo(() => ({ pathname, push: (href: string, options?: {scroll?: boolean}) => router.push(href, options) }), [pathname, router]); return <NavigationProvider value={value}>{children}</NavigationProvider>; }

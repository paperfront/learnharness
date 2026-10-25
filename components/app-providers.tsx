"use client";
import type { ReactNode } from "react";
import { AppShell, SidebarProvider } from "./sidebar";
import { ActivityProvider } from "./activity-dock";
import { ServerEventsProvider } from "./server-events";
import { AppearanceProvider } from "./settings/appearance";
import UpdateBanner from "./update-banner";
export function AppProviders({children}: {children:ReactNode}) { return <ServerEventsProvider><AppearanceProvider><SidebarProvider><ActivityProvider><AppShell>{children}</AppShell></ActivityProvider></SidebarProvider></AppearanceProvider><UpdateBanner/></ServerEventsProvider>; }

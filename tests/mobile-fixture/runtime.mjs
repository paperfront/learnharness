import { chromium, webkit } from "playwright";
export async function launchBrowser() {
 const engine = process.env.LH_BROWSER === "webkit" ? webkit : chromium;
 return engine.launch({headless:true,...(process.env.LH_BROWSER_CHANNEL ? {channel:process.env.LH_BROWSER_CHANNEL} : {})});
}
export const fixtureURL = process.env.LH_FIXTURE_URL ?? `http://127.0.0.1:${process.env.LH_FIXTURE_PORT ?? 4317}`;

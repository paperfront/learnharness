import type { CapacitorConfig } from "@capacitor/cli";
const smoke = process.env.LH_IOS_SMOKE === "1";
const config: CapacitorConfig = { appId: smoke ? "com.paperfront.learnharness.smoke" : process.env.LH_IOS_APP_ID || "com.paperfront.learnharness", appName: "LearnGraphHarness", webDir: smoke ? "mobile-fixture-dist" : "mobile-dist", ios: {contentInset: "never"} };
export default config;

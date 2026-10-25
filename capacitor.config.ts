import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = { appId: process.env.LH_IOS_APP_ID || "com.example.learnharness", appName: "LearnHarness", webDir: "mobile-dist", ios: {contentInset: "never"} };
export default config;

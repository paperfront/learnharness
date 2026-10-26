import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({ root: fileURLToPath(new URL(".", import.meta.url)), plugins: [react()], resolve: {alias: {"@": fileURLToPath(new URL("../..", import.meta.url))}}, publicDir: "../../public", build: {outDir:"../../mobile-fixture-dist", emptyOutDir:true, rollupOptions:{input:fileURLToPath(new URL("native.html",import.meta.url))}}, server: { watch: process.env.LH_FIXTURE_AUTOMATED ? null : {}, hmr: !process.env.LH_FIXTURE_AUTOMATED, host: "127.0.0.1", port: Number(process.env.LH_FIXTURE_PORT ?? 4317), strictPort: true } });

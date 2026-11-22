import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// Cấu hình theo guide Vitest của Next.js; `tsconfigPaths` cho alias `@/*`.
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    // e2e/ là của Playwright (cùng đuôi .spec.ts) — không để Vitest chạy nhầm.
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
  },
});

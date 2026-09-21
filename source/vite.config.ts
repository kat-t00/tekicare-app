import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  base: "./",
  plugins: [react()],
  worker: { format: "es" },
  test: {
    include: ["src/**/*.test.{ts,tsx}", "eval/**/*.test.ts"],
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts"],
  },
});

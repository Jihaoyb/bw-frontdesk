import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

loadEnv({ path: ".env.test.local" });
loadEnv({ path: ".env.local" });

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});

import { defineConfig } from "vitest/config";

// Tests de contrato contra las webs reales: usan la red y se ejecutan en Node,
// fuera del CI normal (`npm run test:live`).
export default defineConfig({
  test: {
    include: ["test/live/**/*.test.ts"],
    testTimeout: 30_000,
  },
});

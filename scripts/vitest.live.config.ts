import { defineConfig } from "vitest/config";

// Tests de contrato contra las webs reales (usan la red): `npm run test:live`.
export default defineConfig({
  test: {
    include: ["test/live/**/*.test.ts"],
    testTimeout: 60_000,
  },
});

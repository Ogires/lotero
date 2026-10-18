import { fileURLToPath } from "node:url";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  const migraciones = await readD1Migrations(
    fileURLToPath(new URL("./migrations", import.meta.url)),
  );

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          bindings: { TEST_MIGRATIONS: migraciones },
        },
      }),
    ],
    test: {
      include: ["test/unit/**/*.test.ts", "test/integracion/**/*.test.ts"],
      setupFiles: ["./test/setup.ts"],
    },
  };
});

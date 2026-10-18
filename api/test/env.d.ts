import type { D1Migration } from "cloudflare:test";

declare global {
  namespace Cloudflare {
    interface Env {
      // Inyectado en vitest.config.ts para aplicar las migraciones en los tests.
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}

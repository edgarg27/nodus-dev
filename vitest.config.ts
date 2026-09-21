import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Vitest runs test files under Node, not under Next.js — Next's automatic .env loading does not
// apply here. Node 24's native loader (no extra dependency) populates process.env before any test
// file or setupFile runs, so tests/setup.ts and every integration test can read DATABASE_URL.
try {
  process.loadEnvFile(".env");
} catch {
  // no .env file on disk — fine in CI, where these variables are injected directly
}

// package.json declares "type": "module" (blueprint.md §10 Bootstrap), so this file is ESM and
// `__dirname` does not exist: the alias is built from `import.meta.url` instead.

export default defineConfig({
  // tsconfig.json sets "jsx": "react-jsx" (mandatory for Next.js 16.3.5 itself, not a Vitest
  // requirement — Next's own `next build` rewrites the file to this value on the first run if it
  // isn't already there, which is why it ships correct from the start instead of relying on that
  // auto-fix). Verified empirically that Vite's default esbuild transform alone can already parse
  // and transform .tsx once "jsx" is a real transform mode instead of "preserve" — this plugin is
  // kept anyway because it's what Next.js's own official Vitest setup guide installs and
  // configures for a Next+React project (https://nextjs.org/docs/app/guides/testing/vitest), not
  // because removing it would break the smoke test today. See Gotcha #11 in blueprint.md §10 for
  // the full history: this repo's `tsconfig.json` used to ship with "jsx": "preserve" (a false
  // premise — Next 16.3.5 never accepted that value), which is what originally made this plugin
  // load-bearing rather than optional.
  plugins: [react()],
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts", "src/**/*.test.ts"],
    exclude: ["blueprints/**", "node_modules/**", ".next/**", "tests/e2e/**"],
    // Integration tests hit the shared, REMOTE Supabase project `nodus-dev` (no local Docker stack):
    // every query crosses the network, hence the longer timeout than a local Postgres needs.
    testTimeout: 30000,
    // Run test files sequentially so table-truncation between files never races and the shared
    // Supavisor pooler is never exhausted (blueprint.md §10 Gotcha #16).
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});

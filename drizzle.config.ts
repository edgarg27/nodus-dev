import { defineConfig } from "drizzle-kit";

// Verify-critical: pnpm db:generate / pnpm db:migrate / pnpm db:studio all read this file.
// drizzle-kit is a standalone CLI — it does NOT load .env on its own. Node 24's native
// `process.loadEnvFile()` (no extra dependency) loads it here so every invocation of drizzle-kit
// picks up DIRECT_URL without every call site having to remember an --env-file flag. Wrapped in
// try/catch because CI environments inject the variable directly and have no .env file on disk.
try {
  process.loadEnvFile(".env");
} catch {
  // no .env file on disk — fine in CI, where DIRECT_URL is injected as a real env var
}

// DIRECT_URL (not the transaction-mode DATABASE_URL) is required here — drizzle-kit runs DDL, and
// the Supavisor transaction-mode pooler (port 6543) does not support it reliably. DIRECT_URL is the
// Supavisor SESSION-mode pooler string (port 5432, IPv4) — NOT the direct connection, which is
// IPv6-only without the IPv4 add-on. See blueprint.md §10 Gotcha #9, CLAUDE.md and
// .claude/rules/db-schema.md.
if (!process.env.DIRECT_URL) {
  throw new Error(
    "DIRECT_URL no está definida. Copia la cadena 'Session pooler' (puerto 5432) del botón " +
      "Connect del proyecto Supabase a .env (ver blueprint.md §10, prerrequisitos manuales).",
  );
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL,
  },
  strict: true,
  verbose: true,
});

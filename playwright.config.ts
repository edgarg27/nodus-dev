import { defineConfig, devices } from "@playwright/test";

// El `webServer` hijo lo arranca Next (que carga .env por sí mismo), pero el RUNNER y los workers de
// Playwright importan tests/helpers/auth-users.ts (necesita NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY y NODUS_*) y tests/helpers/reset-db.ts — y Next no carga .env para ellos.
// Node 24 lo carga aquí, antes de que se evalúe cualquier archivo de prueba; los workers heredan el
// process.env ya poblado. Wrapped in try/catch: CI inyecta las variables y no hay .env en disco.
try {
  process.loadEnvFile(".env");
} catch {
  // no .env file on disk — fine when the variables are injected directly
}

export default defineConfig({
  testDir: "./tests/e2e",
  // The app talks to the shared REMOTE Supabase project (nodus-dev): every page load crosses the
  // network, so the default 30s per test is too tight (blueprint.md §10 Gotcha #16).
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // El proyecto móvil solo corre los specs que verifican responsividad/accesibilidad: correr TODOS
    // los specs dos veces contra la base compartida duplicaría datos fijos (p. ej. direcciones).
    {
      name: "mobile-375",
      use: { viewport: { width: 375, height: 812 } },
      testMatch: /(app-shell|landing|a11y-public|a11y-app)\.spec\.ts$/,
    },
  ],
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000",
    // false: un servidor viejo que quedara en el puerto 3000 daría falsos verdes; si está ocupado, falla.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

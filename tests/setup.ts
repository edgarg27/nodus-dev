// Cargado por Vitest antes de CADA archivo de prueba (ver vitest.config.ts `setupFiles`) —
// incluido el smoke test del paso 1, que corre antes de que exista ningún módulo de base de
// datos. Por eso este archivo deliberadamente NO importa nada de `src/lib/db` — solo advierte si
// las variables de entorno de integración faltan. El truncado de tablas entre pruebas
// (`tests/helpers/reset-db.ts`) lo importa cada archivo de prueba de integración por sí mismo,
// desde el paso 4 en adelante, cuando `src/lib/db/client.ts` ya existe.
import { vi } from "vitest";

// `next/font/google` (y `next/font/local`) solo son funciones reales bajo el compilador de Next
// (SWC/webpack) — importados directo por Vitest (sin ese compilador en el medio) resuelven a algo
// no invocable, y llamar `Geist({...})` (el import que trae `src/app/layout.tsx` del scaffold)
// lanza `TypeError: Geist is not a function` apenas Vitest importa ese módulo — confirmado
// empíricamente.
//
// Un `Proxy` genérico (`new Proxy({}, { get: () => font })`, incluso con `ownKeys`/
// `getOwnPropertyDescriptor` agregados) NO sirve aquí — probado contra Vitest 5.0.0 con una
// reproducción mínima real: Vitest valida los named exports de un mock de `vi.mock` de forma
// estática antes de invocar el `get` del Proxy, y falla con `[vitest] No "Geist" export is
// defined on the "next/font/google" mock` sin importar qué trampas tenga el Proxy. Por eso este
// mock enumera los nombres reales como propiedades planas — la única forma verificada que
// funciona en Vitest 5 — cubriendo tanto `Geist`/`Geist_Mono` (el import que trae el scaffold
// hasta el paso 2) como `Manrope` (el que el paso 2 deja en su lugar, ver su `Do`): si el import
// de fuente vuelve a cambiar, este archivo necesita una línea más aquí, un costo aceptado a
// cambio de un mock que realmente pasa.
vi.mock("next/font/google", () => {
  const font = () => ({ className: "", variable: "", style: { fontFamily: "" } });
  return { Geist: font, Geist_Mono: font, Manrope: font };
});
vi.mock("next/font/local", () => {
  const font = () => ({ className: "", variable: "", style: { fontFamily: "" } });
  return { default: font };
});

const requiredForIntegration = ["DATABASE_URL", "DIRECT_URL"];

for (const key of requiredForIntegration) {
  if (!process.env[key]) {
    // Sin biome-ignore aquí: `noConsole` no está en el preset "recommended" que fija biome.json,
    // así que nada la reporta en este proyecto — un comentario de supresión para una regla que
    // nunca corre es en sí mismo un error de Biome (suppressions/unused).
    console.warn(
      `[tests/setup] ${key} no está definida. Las pruebas de integración fallarán al conectar. ` +
        "Copia los valores del proyecto Supabase nodus-dev a .env (blueprint.md §10).",
    );
  }
}

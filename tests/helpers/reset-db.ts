// Trunca las tablas de la aplicación entre pruebas de integración para que ningún test dependa
// del orden de ejecución ni de datos dejados por otro test.
//
// LA BASE ES COMPARTIDA Y REMOTA (proyecto Supabase alojado `nodus-dev`, sin Docker): este helper es
// destructivo, así que la PRIMERA línea es la guardia del paso 3 — `assertSafeToReset(process.env)`
// exige `NODUS_ALLOW_DB_RESET=yes`, el ref del proyecto dev en DATABASE_URL/DIRECT_URL/
// NEXT_PUBLIC_SUPABASE_URL y (si existe) que el ref de producción no aparezca en ninguna. Solo
// después se importa el cliente de base de datos (import dinámico: sin la guardia satisfecha nunca
// se abre una conexión).
//
// Lista deliberadamente acotada a las 4 tablas que existen desde el paso 4 (`usuario`,
// `propiedad`, `propiedad_foto`, `contact_request`). Las demás NO van aquí todavía — un `truncate`
// que nombrara una tabla que aún no existe fallaría con `relation "..." does not exist` en cada
// prueba de integración anterior a su paso:
//   - `broker_solicitud` y `broker_revocacion`: no existen hasta el paso 26 (solicitudes de broker);
//     el paso 26 EDITA este archivo para agregarlas, en el mismo commit que crea las tablas.
//   - `rate_limit_hit`: no existe hasta el paso 36 (hardening); el paso 36 EDITA este archivo otra
//     vez para agregarla, en el mismo commit que agrega la tabla.
// Nunca antes — mismo patrón de "staging" que `tsconfig.tests.json`/`tsconfig.scripts.json`.
//
// Esto solo vacía el esquema `public`: los usuarios de Supabase Auth de los fixtures se borran aparte
// con `limpiarUsuariosAuth()` (tests/helpers/auth-users.ts).
import { sql } from "drizzle-orm";
import { assertSafeToReset } from "../../src/lib/db/dev-guard.ts";

export async function resetTestDatabase(): Promise<void> {
  assertSafeToReset(process.env);
  const { db } = await import("../../src/lib/db/client.ts");
  await db.execute(
    sql`truncate table contact_request, propiedad_foto, propiedad, usuario restart identity cascade;`,
  );
}

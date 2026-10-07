// Trunca las tablas de la aplicación entre pruebas de integración para que ningún test dependa
// del orden de ejecución ni de datos dejados por otro test.
//
// LA BASE ES REMOTA (proyecto Supabase alojado de PRUEBAS, `.env.test`; sin Docker): este helper es
// destructivo, así que la PRIMERA línea es la guardia — `assertSafeToResetTests(process.env)` exige
// `NODUS_ALLOW_DB_RESET=yes`, el ref del proyecto de pruebas en DATABASE_URL/DIRECT_URL/
// NEXT_PUBLIC_SUPABASE_URL, y que ni el ref de nodus-dev ni el de producción aparezcan en ninguna. Solo
// después se importa el cliente de base de datos (import dinámico: sin la guardia satisfecha nunca
// se abre una conexión).
//
// Lista deliberadamente acotada a las tablas que ya existen en cada paso — un `truncate` que
// nombrara una tabla inexistente fallaría con `relation "..." does not exist` en cada prueba de
// integración anterior a su paso:
//   - `usuario`, `propiedad`, `propiedad_foto`, `contact_request`: existen desde el paso 4.
//   - `broker_solicitud`, `broker_revocacion`, `broker_atribucion_historica`: agregadas por el
//     paso 26 (solicitudes de broker), en el mismo commit que crea las tablas.
//   - `favorito`, `busqueda_guardada`: agregadas con la migración 0009 (favoritos y búsquedas
//     guardadas), en el mismo commit que crea las tablas.
//   - `agencia_perfil`, `agencia_contacto`: agregadas con la migración 0014 (perfil de agencia del
//     oferente), en el mismo commit que crea las tablas.
//   - `propiedad_metrica_diaria`, `conversacion`, `mensaje`: agregadas con la migración 0016
//     (métricas y chat del panel del oferente), en el mismo commit que crea las tablas.
//   - `rate_limit_hit`: no existe hasta el paso 36 (hardening); el paso 36 EDITA este archivo otra
//     vez para agregarla, en el mismo commit que agrega la tabla.
// Nunca antes — mismo patrón de "staging" que `tsconfig.tests.json`/`tsconfig.scripts.json`.
//
// Esto solo vacía el esquema `public`: los usuarios de Supabase Auth de los fixtures se borran aparte
// con `limpiarUsuariosAuth()` (tests/helpers/auth-users.ts).
import { sql } from "drizzle-orm";
import { assertSafeToResetTests } from "../../src/lib/db/dev-guard.ts";

export async function resetTestDatabase(): Promise<void> {
  assertSafeToResetTests(process.env);
  const { db } = await import("../../src/lib/db/client.ts");
  await db.execute(
    sql`truncate table mensaje, conversacion, propiedad_metrica_diaria, agencia_contacto, agencia_perfil, favorito, busqueda_guardada, rate_limit_hit, broker_atribucion_historica, broker_revocacion, broker_solicitud, contact_request, propiedad_foto, propiedad, usuario restart identity cascade;`,
  );
}

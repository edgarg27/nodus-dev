import postgres from "postgres";
import { env, requireEnv } from "../src/lib/env.ts";
import { normalizeAddress } from "../src/lib/normalize-address.ts";

// Vuelve a calcular `direccion_normalizada` de todas las propiedades con las reglas actuales de
// `normalizeAddress` (correr después de cambiarlas). No borra ni da de baja nada: si al
// normalizar dos propiedades vigentes quedan como la misma (índice único `uq_propiedad_duplicado`),
// esa fila se deja como estaba y se lista para revisarla a mano. Como `make-admin`, se corre también
// contra producción, así que no lleva la guardia de `assertSafeToReset`.
//
//   pnpm db:renormalize            aplica los cambios
//   pnpm db:renormalize --simular  solo dice qué cambiaría
async function renormalizar() {
  const simular = process.argv.includes("--simular");
  requireEnv(["DIRECT_URL"]);
  const sql = postgres(env.DIRECT_URL as string);

  let cambiadas = 0;
  const choques: string[] = [];
  try {
    const filas = await sql<{ id: string; direccion: string; direccion_normalizada: string }[]>`
      select id, direccion, direccion_normalizada from propiedad order by created_at`;
    for (const fila of filas) {
      const nueva = normalizeAddress(fila.direccion);
      if (nueva === fila.direccion_normalizada) continue;
      if (simular) {
        cambiadas += 1;
        continue;
      }
      try {
        await sql`update propiedad set direccion_normalizada = ${nueva} where id = ${fila.id}`;
        cambiadas += 1;
      } catch (err) {
        if ((err as { code?: string }).code !== "23505") throw err;
        choques.push(`${fila.id}  ${fila.direccion}`);
      }
    }
    console.log(
      `${filas.length} propiedades revisadas; ${cambiadas} ${simular ? "cambiarían" : "actualizadas"}.`,
    );
    if (choques.length > 0) {
      console.log(
        `${choques.length} no se tocaron porque ya hay otra propiedad vigente en la misma dirección y ` +
          "punto del mapa (posibles duplicados para revisar):",
      );
      for (const choque of choques) console.log(`  ${choque}`);
    }
  } finally {
    await sql.end();
  }
}

await renormalizar();

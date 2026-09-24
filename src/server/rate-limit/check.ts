import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { rateLimitHit } from "../../lib/db/schema.ts";

const VENTANA_MS = 60_000;
const RETENCION_MS = 10 * 60_000;

export interface ResultadoLimite {
  ok: boolean;
  retryAfterSegundos?: number;
}

interface OpcionesLimite {
  max: number;
  ahora?: Date;
}

// Ventana fija de un minuto por clave (`contact:<ip>`, `geocode:<ip>`): una cubeta por minuto,
// incrementada de forma atómica con `INSERT … ON CONFLICT DO UPDATE`. No hay límite de login:
// Supabase Auth aplica los suyos.
export async function verificarLimite(
  clave: string,
  { max, ahora = new Date() }: OpcionesLimite,
): Promise<ResultadoLimite> {
  const ventanaInicio = new Date(Math.floor(ahora.getTime() / VENTANA_MS) * VENTANA_MS);

  const [fila] = await db
    .insert(rateLimitHit)
    .values({ clave, ventanaInicio, conteo: 1 })
    .onConflictDoUpdate({
      target: [rateLimitHit.clave, rateLimitHit.ventanaInicio],
      set: { conteo: sql`${rateLimitHit.conteo} + 1` },
    })
    .returning({ conteo: rateLimitHit.conteo });

  await db
    .delete(rateLimitHit)
    .where(
      and(
        eq(rateLimitHit.clave, clave),
        lt(rateLimitHit.ventanaInicio, new Date(ahora.getTime() - RETENCION_MS)),
      ),
    );

  const conteo = fila?.conteo ?? 1;
  if (conteo <= max) {
    return { ok: true };
  }

  const finVentana = ventanaInicio.getTime() + VENTANA_MS;
  const retryAfterSegundos = Math.max(
    1,
    Math.min(60, Math.ceil((finVentana - ahora.getTime()) / 1000)),
  );
  return { ok: false, retryAfterSegundos };
}

// La IP sale del primer valor de `x-forwarded-for` y, si falta, de "desconocida" — un límite de
// abuso, no una defensa de identidad (§14). Vercel no se verificó en esta revisión (§20.1).
export function obtenerIpCliente(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const primera = forwardedFor?.split(",")[0]?.trim();
  return primera || "desconocida";
}

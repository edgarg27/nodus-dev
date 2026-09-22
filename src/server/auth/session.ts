import { eq } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { usuario } from "../../lib/db/schema.ts";
import { createClient } from "../../lib/supabase/server.ts";

export interface ActorAutenticado {
  id: string;
  email: string;
  nombre: string;
  rol: "buscador" | "oferente" | "admin";
  isBroker: boolean;
  brokerCode: string | null;
  referralBrokerId: string | null;
}

function mapearActor(fila: typeof usuario.$inferSelect): ActorAutenticado {
  return {
    id: fila.id,
    email: fila.email,
    nombre: fila.nombre,
    rol: fila.rol as ActorAutenticado["rol"],
    isBroker: fila.isBroker,
    brokerCode: fila.brokerCode,
    referralBrokerId: fila.referralBrokerId,
  };
}

/**
 * Único punto de acceso a la sesión. Verifica la sesión con `getClaims()` (verifica la firma del
 * JWT; nunca `getSession()` en servidor) y aprovisiona just-in-time la fila `public.usuario` si no
 * existe. `rol` sale de una lista de permitidos: solo `user_metadata.rol === "oferente"` cuenta —
 * cualquier otro valor (incluido `admin`) aprovisiona `buscador`, porque la metadata la puede fijar
 * el propio cliente sin pasar por el formulario de registro. Sin sesión válida devuelve `null`,
 * nunca lanza.
 */
export async function getUsuarioActual(): Promise<ActorAutenticado | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;

  const claims = data.claims as {
    sub: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  };
  const id = claims.sub;
  const email = claims.email ?? "";
  const metadata = claims.user_metadata ?? {};

  const [existente] = await db.select().from(usuario).where(eq(usuario.id, id));
  if (existente) return mapearActor(existente);

  const nombre =
    typeof metadata.nombre === "string" && metadata.nombre.length > 0
      ? metadata.nombre
      : (email.split("@")[0] ?? "");
  const rol = metadata.rol === "oferente" ? "oferente" : "buscador";

  let referralBrokerId: string | null = null;
  if (typeof metadata.ref === "string" && metadata.ref.length > 0) {
    const [broker] = await db.select().from(usuario).where(eq(usuario.brokerCode, metadata.ref));
    if (broker?.isBroker) referralBrokerId = broker.id;
  }

  await db
    .insert(usuario)
    .values({ id, email, nombre, rol, referralBrokerId })
    .onConflictDoNothing();

  const [fila] = await db.select().from(usuario).where(eq(usuario.id, id));
  if (!fila) return null;
  return mapearActor(fila);
}

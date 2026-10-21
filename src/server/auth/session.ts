import { and, eq, ne } from "drizzle-orm";
import { datosPropietarioDeMetadata } from "../../lib/auth/datos-propietario.ts";
import { db } from "../../lib/db/client.ts";
import { agenciaPerfil, usuario } from "../../lib/db/schema.ts";
import { createClient } from "../../lib/supabase/server.ts";
import { abrirSolicitudPorRegistro } from "../broker-requests/mutations.ts";
import { crearClienteAdmin } from "../supabase/admin.ts";

export interface ActorAutenticado {
  id: string;
  email: string;
  nombre: string;
  rol: "buscador" | "propietario" | "admin";
  isBroker: boolean;
  brokerCode: string | null;
  referralBrokerId: string | null;
  // Solo propietarios: "particular" (dueño directo) o "inmobiliaria". Decide si usa la Red.
  tipoAnunciante?: string | null;
  // "P-0783" ya formateado en pantalla; lo asigna la base al pasar a propietario.
  numeroPropietario?: number | null;
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
    tipoAnunciante: fila.tipoAnunciante,
    numeroPropietario: fila.numeroPropietario,
  };
}

// Si en Supabase Auth se borra una cuenta y se vuelve a crear con el mismo correo, la fila vieja de
// `usuario` (con el id de la cuenta borrada) conserva ese correo, que es único: la cuenta nueva no se
// podría aprovisionar y quedaría "atorada" (con sesión, pero sin usuario en la app). Aquí, solo si
// la cuenta vieja ya no existe en Auth, se le cambia el correo a "nombre+anterior-<id>@dominio"; la
// fila se conserva con su historial (aprobaciones, solicitudes) y la nueva se crea normal.
async function liberarCorreoDeCuentaBorrada(id: string, email: string): Promise<void> {
  if (!email) return;
  const [anterior] = await db
    .select({ id: usuario.id })
    .from(usuario)
    .where(and(eq(usuario.email, email), ne(usuario.id, id)));
  if (!anterior) return;

  const { data, error } = await crearClienteAdmin().auth.admin.getUserById(anterior.id);
  // Solo si Auth confirma que no existe; ante cualquier otro error no se toca nada.
  const yaNoExiste =
    !data?.user && (error?.status === 404 || /not found/i.test(error?.message ?? ""));
  if (!yaNoExiste) return;

  const [local, dominio] = email.split("@");
  await db
    .update(usuario)
    .set({
      email: `${local}+anterior-${anterior.id.slice(0, 8)}@${dominio}`,
      updatedAt: new Date(),
    })
    .where(eq(usuario.id, anterior.id));
}

/**
 * Único punto de acceso a la sesión. Verifica la sesión con `getClaims()` (verifica la firma del
 * JWT; nunca `getSession()` en servidor) y aprovisiona just-in-time la fila `public.usuario` si no
 * existe. `rol` sale de una lista de permitidos: solo `user_metadata.rol === "propietario"` (o su nombre anterior, "oferente") cuenta —
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
  // "oferente" es el nombre anterior del rol: las cuentas creadas antes del cambio lo traen en su metadata.
  const rol =
    metadata.rol === "propietario" || metadata.rol === "oferente" ? "propietario" : "buscador";

  let referralBrokerId: string | null = null;
  if (typeof metadata.ref === "string" && metadata.ref.length > 0) {
    const [broker] = await db.select().from(usuario).where(eq(usuario.brokerCode, metadata.ref));
    if (broker?.isBroker) referralBrokerId = broker.id;
  }

  // El propietario deja en el registro teléfono, cómo publica y, si es inmobiliaria, su nombre (que se
  // vuelve el nombre de su agencia). Datos inválidos se ignoran: los puede completar en su perfil.
  const datosPropietario = rol === "propietario" ? datosPropietarioDeMetadata(metadata) : null;

  await liberarCorreoDeCuentaBorrada(id, email);
  const insertados = await db
    .insert(usuario)
    .values({
      id,
      email,
      nombre,
      rol,
      referralBrokerId,
      telefono: datosPropietario?.telefono ?? null,
      tipoAnunciante: datosPropietario?.tipoAnunciante ?? null,
    })
    .onConflictDoNothing()
    .returning({ id: usuario.id });
  if (insertados.length > 0 && datosPropietario?.empresa) {
    await db
      .insert(agenciaPerfil)
      .values({ usuarioId: id, nombre: datosPropietario.empresa })
      .onConflictDoNothing();
  }
  // Todo propietario nuevo queda como solicitud para que Captive lo apruebe: de broker si eligió
  // "Soy broker"; de dueño si eligió "Soy el dueño" (o si no eligió).
  if (insertados.length > 0 && rol === "propietario") {
    const esBroker = datosPropietario?.tipoAnunciante === "inmobiliaria";
    await abrirSolicitudPorRegistro(
      id,
      esBroker ? "broker" : "dueno",
      esBroker ? (datosPropietario?.empresa ?? "") : "",
    );
  }

  const [fila] = await db.select().from(usuario).where(eq(usuario.id, id));
  if (!fila) return null;
  return mapearActor(fila);
}

import { eq } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { contactRequest, propiedad, usuario } from "../../lib/db/schema.ts";
import { requireRol } from "../auth/guards.ts";
import type { ActorAutenticado } from "../auth/session.ts";
import { marcarClientePendiente } from "../clientes/mutations.ts";

export interface CrearContactRequestInput {
  propiedadId: string;
  quiereFinanciamiento: boolean;
  mensaje?: string;
}

export type ErrorContactRequest =
  | { code: "forbidden"; status: 403; message: string }
  | { code: "not_found"; status: 404; message: string };

// La solicitud llega solo a Captive (canal "captive"): no se abre chat con el oferente ni se le da
// al buscador su teléfono. Los tres campos siguen en la respuesta (siempre `null`) para no romper
// a los clientes de la API.
export interface ContactRequestCreada {
  id: string;
  conversacionId: null;
  telefonoOferente: null;
  whatsappUrl: null;
}

export type ResultadoContactRequest =
  | { ok: true; data: ContactRequestCreada }
  | { ok: false; error: ErrorContactRequest };

function errorForbidden(): ResultadoContactRequest {
  return {
    ok: false,
    error: { code: "forbidden", status: 403, message: "Se requiere el rol buscador" },
  };
}

function errorNotFound(): ResultadoContactRequest {
  return {
    ok: false,
    error: { code: "not_found", status: 404, message: "Propiedad no encontrada" },
  };
}

// Lee `propiedad.oferente_id` (solo de propiedades activo y publicada) y el
// `referral_broker_id` del buscador actual, copiando `broker_id` únicamente si ese usuario es
// broker en este momento — ningún cálculo de atribución ocurre en la UI.
export async function crearContactRequest(
  actor: ActorAutenticado | null,
  input: CrearContactRequestInput,
): Promise<ResultadoContactRequest> {
  const permiso = requireRol(actor, "buscador");
  if (!permiso.ok || !actor) return errorForbidden();

  const [prop] = await db.select().from(propiedad).where(eq(propiedad.id, input.propiedadId));
  if (!prop?.activo || prop.estadoPublicacion !== "publicada") return errorNotFound();

  let brokerId: string | null = null;
  if (actor.referralBrokerId) {
    const [broker] = await db.select().from(usuario).where(eq(usuario.id, actor.referralBrokerId));
    if (broker?.isBroker) brokerId = broker.id;
  }

  const [fila] = await db
    .insert(contactRequest)
    .values({
      buscadorId: actor.id,
      propiedadId: prop.id,
      oferenteId: prop.oferenteId,
      brokerId,
      quiereFinanciamiento: input.quiereFinanciamiento,
      mensaje: input.mensaje ?? null,
      canal: "captive",
    })
    .returning();
  if (!fila) throw new Error("insert de contact_request no devolvió fila");

  // Captive le da seguimiento desde "Clientes y prospectos": el cliente vuelve a pendiente.
  await marcarClientePendiente(actor.id);

  return {
    ok: true,
    data: { id: fila.id, conversacionId: null, telefonoOferente: null, whatsappUrl: null },
  };
}

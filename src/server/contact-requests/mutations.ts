import { eq } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { contactRequest, propiedad, usuario } from "../../lib/db/schema.ts";
import { obtenerContactoPublico } from "../agency/queries.ts";
import { requireRol } from "../auth/guards.ts";
import type { ActorAutenticado } from "../auth/session.ts";

export interface CrearContactRequestInput {
  propiedadId: string;
  quiereFinanciamiento: boolean;
  mensaje?: string;
}

export type ErrorContactRequest =
  | { code: "forbidden"; status: 403; message: string }
  | { code: "not_found"; status: 404; message: string };

export interface ContactRequestCreada {
  id: string;
  telefonoOferente: string | null;
  whatsappUrl: string | null;
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

// El chat de WhatsApp abre con el mensaje del buscador, o con uno que identifica el espacio.
function construirWhatsappUrl(telefono: string | null, texto: string): string | null {
  if (!telefono) return null;
  const digitos = telefono.replace(/\D/g, "");
  return digitos.length > 0 ? `https://wa.me/${digitos}?text=${encodeURIComponent(texto)}` : null;
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
    })
    .returning();
  if (!fila) throw new Error("insert de contact_request no devolvió fila");

  // El contacto que el oferente eligió para esta propiedad (WhatsApp antes que teléfono), o su
  // teléfono de cuenta si no eligió ninguno.
  const contacto = await obtenerContactoPublico(prop.oferenteId, prop.contactoId);
  const telefonoOferente = contacto.whatsapp ?? contacto.telefono;
  return {
    ok: true,
    data: {
      id: fila.id,
      telefonoOferente,
      whatsappUrl: construirWhatsappUrl(
        telefonoOferente,
        input.mensaje ??
          `Hola, me interesa el espacio en ${prop.direccion} que vi en Captive by Nodus.`,
      ),
    },
  };
}

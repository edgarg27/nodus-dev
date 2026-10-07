import { aCsv, respuestaCsv } from "../../../../../lib/csv.ts";
import { ETIQUETA_ESTADO_LEAD, leerBandeja } from "../../../../../lib/leads.ts";
import { requireRol } from "../../../../../server/auth/guards.ts";
import { getUsuarioActual } from "../../../../../server/auth/session.ts";
import { listarBandejaDelOferente } from "../../../../../server/contact-requests/inbox.ts";
import { respuestaError, sinSesion } from "../../../../../server/http/envelope.ts";

// CSV de la bandeja del oferente (una fila por persona), respetando búsqueda y estado. Solo lectura.
export async function GET(request: Request) {
  const actor = await getUsuarioActual();
  if (!actor) return sinSesion();
  if (!requireRol(actor, "oferente").ok) {
    return respuestaError(403, "forbidden", "Se requiere el rol oferente");
  }

  const url = new URL(request.url);
  const params = leerBandeja((clave) => url.searchParams.get(clave) ?? undefined);
  const bandeja = await listarBandejaDelOferente(actor.id, {
    q: params.q,
    estado: params.estado,
    porPagina: null,
  });

  const csv = aCsv(
    [
      "Nombre",
      "Correo",
      "Teléfono",
      "Estado",
      "Solicitudes",
      "Propiedades de interés",
      "Quiere financiamiento",
      "Último mensaje",
      "Última actividad",
    ],
    bandeja.personas.map((persona) => [
      persona.nombre,
      persona.email,
      persona.telefono,
      ETIQUETA_ESTADO_LEAD[persona.estado],
      persona.solicitudes,
      persona.propiedades.map((p) => p.titulo ?? p.direccion).join(" | "),
      persona.quiereFinanciamiento ? "Sí" : "No",
      persona.ultimoMensaje,
      persona.ultimaFecha.toISOString().slice(0, 10),
    ]),
  );
  return respuestaCsv("leads.csv", csv);
}

import { and, desc, eq } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { contactRequest, propiedad, usuario } from "../../lib/db/schema.ts";

export interface LeadPropietario {
  id: string;
  propiedadId: string;
  direccionPropiedad: string;
  nombreBuscador: string;
  emailBuscador: string;
  telefonoBuscador: string | null;
  quiereFinanciamiento: boolean;
  mensaje: string | null;
  createdAt: Date;
}

// Siempre filtra por `propietario_id === actor.id` — un `propiedadId` que no pertenece al propietario
// se ignora en vez de devolver los leads de otro dueño (§14). Solo canal "directo": las solicitudes
// nuevas llegan únicamente a Captive.
export async function listarLeadsDelPropietario(
  propietarioId: string,
  propiedadId?: string,
): Promise<LeadPropietario[]> {
  const condiciones = [
    eq(contactRequest.propietarioId, propietarioId),
    eq(contactRequest.canal, "directo"),
  ];

  if (propiedadId) {
    const [propiedadPropia] = await db
      .select({ id: propiedad.id })
      .from(propiedad)
      .where(and(eq(propiedad.id, propiedadId), eq(propiedad.propietarioId, propietarioId)));
    if (propiedadPropia) condiciones.push(eq(contactRequest.propiedadId, propiedadId));
  }

  return db
    .select({
      id: contactRequest.id,
      propiedadId: contactRequest.propiedadId,
      direccionPropiedad: propiedad.direccion,
      nombreBuscador: usuario.nombre,
      emailBuscador: usuario.email,
      telefonoBuscador: usuario.telefono,
      quiereFinanciamiento: contactRequest.quiereFinanciamiento,
      mensaje: contactRequest.mensaje,
      createdAt: contactRequest.createdAt,
    })
    .from(contactRequest)
    .innerJoin(propiedad, eq(contactRequest.propiedadId, propiedad.id))
    .innerJoin(usuario, eq(contactRequest.buscadorId, usuario.id))
    .where(and(...condiciones))
    .orderBy(desc(contactRequest.createdAt));
}

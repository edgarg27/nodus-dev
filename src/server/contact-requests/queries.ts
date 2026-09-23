import { and, desc, eq } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { contactRequest, propiedad, usuario } from "../../lib/db/schema.ts";

export interface LeadOferente {
  id: string;
  propiedadId: string;
  direccionPropiedad: string;
  nombreBuscador: string;
  emailBuscador: string;
  quiereFinanciamiento: boolean;
  createdAt: Date;
}

// Siempre filtra por `oferente_id === actor.id` — un `propiedadId` que no pertenece al oferente
// se ignora en vez de devolver los leads de otro dueño (§14).
export async function listarLeadsDelOferente(
  oferenteId: string,
  propiedadId?: string,
): Promise<LeadOferente[]> {
  const condiciones = [eq(contactRequest.oferenteId, oferenteId)];

  if (propiedadId) {
    const [propiedadPropia] = await db
      .select({ id: propiedad.id })
      .from(propiedad)
      .where(and(eq(propiedad.id, propiedadId), eq(propiedad.oferenteId, oferenteId)));
    if (propiedadPropia) condiciones.push(eq(contactRequest.propiedadId, propiedadId));
  }

  return db
    .select({
      id: contactRequest.id,
      propiedadId: contactRequest.propiedadId,
      direccionPropiedad: propiedad.direccion,
      nombreBuscador: usuario.nombre,
      emailBuscador: usuario.email,
      quiereFinanciamiento: contactRequest.quiereFinanciamiento,
      createdAt: contactRequest.createdAt,
    })
    .from(contactRequest)
    .innerJoin(propiedad, eq(contactRequest.propiedadId, propiedad.id))
    .innerJoin(usuario, eq(contactRequest.buscadorId, usuario.id))
    .where(and(...condiciones))
    .orderBy(desc(contactRequest.createdAt));
}

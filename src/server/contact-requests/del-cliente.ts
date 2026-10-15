import { desc, eq } from "drizzle-orm";
import type { PasoSolicitud } from "../../lib/clientes.ts";
import { db } from "../../lib/db/client.ts";
import { contactRequest, propiedad } from "../../lib/db/schema.ts";
import { obtenerPrimerasFotos } from "../properties/queries.ts";

// Solicitudes de informes del propio cliente, para su pantalla de inicio: en qué va cada una. No
// incluye nada del propietario (ni nombre ni contacto) ni el precio: eso solo lo ve Captive.

export const MAXIMO_SOLICITUDES_INICIO = 10;

export interface SolicitudDelCliente {
  id: string;
  canal: "directo" | "captive";
  paso: PasoSolicitud;
  creadaEn: Date;
  propiedad: {
    id: string;
    tipo: string;
    modalidad: string;
    ciudad: string;
    direccion: string;
    // Si dejó de estar publicada, la tarjeta no enlaza a la ficha.
    publicada: boolean;
    fotoUrl: string | null;
  };
}

export async function listarSolicitudesDelCliente(
  buscadorId: string,
): Promise<SolicitudDelCliente[]> {
  const filas = await db
    .select({
      id: contactRequest.id,
      canal: contactRequest.canal,
      paso: contactRequest.paso,
      creadaEn: contactRequest.createdAt,
      propiedadId: propiedad.id,
      tipo: propiedad.tipo,
      modalidad: propiedad.modalidad,
      ciudad: propiedad.ciudad,
      direccion: propiedad.direccion,
      activo: propiedad.activo,
      estadoPublicacion: propiedad.estadoPublicacion,
    })
    .from(contactRequest)
    .innerJoin(propiedad, eq(contactRequest.propiedadId, propiedad.id))
    .where(eq(contactRequest.buscadorId, buscadorId))
    .orderBy(desc(contactRequest.createdAt))
    .limit(MAXIMO_SOLICITUDES_INICIO);

  const fotos = await obtenerPrimerasFotos(filas.map((fila) => fila.propiedadId));
  return filas.map((fila) => {
    const publicada = fila.activo && fila.estadoPublicacion === "publicada";
    return {
      id: fila.id,
      canal: fila.canal as SolicitudDelCliente["canal"],
      paso: fila.paso as PasoSolicitud,
      creadaEn: fila.creadaEn,
      propiedad: {
        id: fila.propiedadId,
        tipo: fila.tipo,
        modalidad: fila.modalidad,
        ciudad: fila.ciudad,
        direccion: fila.direccion,
        publicada,
        fotoUrl: publicada ? (fotos.get(fila.propiedadId)?.storageUrl ?? null) : null,
      },
    };
  });
}

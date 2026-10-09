import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  type EstadoCliente,
  estadoDeCliente,
  type PasoSolicitud,
  type TipoNota,
} from "../../lib/clientes.ts";
import { db } from "../../lib/db/client.ts";
import { contactRequest, propiedad, seguimientoNota, usuario } from "../../lib/db/schema.ts";
import { obtenerContactoPublico } from "../agency/queries.ts";
import { requireRol } from "../auth/guards.ts";
import type { ActorAutenticado } from "../auth/session.ts";

// Detalle de un cliente en "Clientes y prospectos": sus solicitudes (con el paso del seguimiento y
// el contacto del oferente) y la bitácora. Solo admin.

export interface SolicitudDeCliente {
  id: string;
  canal: "directo" | "captive";
  creadaEn: Date;
  quiereFinanciamiento: boolean;
  mensaje: string | null;
  paso: PasoSolicitud;
  proximaAccion: { texto: string; en: Date } | null;
  propiedad: {
    id: string;
    titulo: string | null;
    direccion: string;
    ciudad: string;
    tipo: string;
    modalidad: string;
    publicada: boolean;
  };
  // A quién hay que llamarle para confirmar la disponibilidad.
  oferente: {
    id: string;
    nombre: string;
    agencia: string;
    email: string;
    telefono: string | null;
    whatsapp: string | null;
    esBroker: boolean;
    brokerCode: string | null;
  };
  // Broker que refirió al cliente (atribución), si lo hay.
  brokerReferido: string | null;
}

export interface NotaDeSeguimiento {
  id: string;
  tipo: TipoNota;
  texto: string;
  creadaEn: Date;
  autor: string;
  contactRequestId: string | null;
}

export interface DetalleCliente {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  registradoEn: Date;
  estado: EstadoCliente | null;
  solicitudes: SolicitudDeCliente[];
  notas: NotaDeSeguimiento[];
}

export async function obtenerCliente(
  actor: ActorAutenticado | null,
  buscadorId: string,
): Promise<DetalleCliente | null> {
  if (!requireRol(actor, "admin").ok) return null;

  const [cliente] = await db
    .select({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      telefono: usuario.telefono,
      rol: usuario.rol,
      registradoEn: usuario.createdAt,
    })
    .from(usuario)
    .where(eq(usuario.id, buscadorId));
  if (!cliente || cliente.rol === "admin") return null;

  const oferente = alias(usuario, "oferente");
  const broker = alias(usuario, "broker");
  const filas = await db
    .select({
      id: contactRequest.id,
      canal: contactRequest.canal,
      creadaEn: contactRequest.createdAt,
      quiereFinanciamiento: contactRequest.quiereFinanciamiento,
      mensaje: contactRequest.mensaje,
      paso: contactRequest.paso,
      proximaAccion: contactRequest.proximaAccion,
      proximaAccionEn: contactRequest.proximaAccionEn,
      propiedadId: propiedad.id,
      titulo: propiedad.titulo,
      direccion: propiedad.direccion,
      ciudad: propiedad.ciudad,
      tipo: propiedad.tipo,
      modalidad: propiedad.modalidad,
      activo: propiedad.activo,
      estadoPublicacion: propiedad.estadoPublicacion,
      contactoId: propiedad.contactoId,
      oferenteId: oferente.id,
      oferenteNombre: oferente.nombre,
      oferenteEmail: oferente.email,
      oferenteEsBroker: oferente.isBroker,
      oferenteBrokerCode: oferente.brokerCode,
      brokerNombre: broker.nombre,
    })
    .from(contactRequest)
    .innerJoin(propiedad, eq(contactRequest.propiedadId, propiedad.id))
    .innerJoin(oferente, eq(contactRequest.oferenteId, oferente.id))
    .leftJoin(broker, eq(contactRequest.brokerId, broker.id))
    .where(eq(contactRequest.buscadorId, buscadorId))
    .orderBy(desc(contactRequest.createdAt));

  // Un cliente sin solicitudes solo existe aquí si es buscador (los oferentes no son prospectos).
  if (filas.length === 0 && cliente.rol !== "buscador") return null;

  const solicitudes: SolicitudDeCliente[] = await Promise.all(
    filas.map(async (fila) => {
      const contacto = await obtenerContactoPublico(fila.oferenteId, fila.contactoId);
      return {
        id: fila.id,
        canal: fila.canal as SolicitudDeCliente["canal"],
        creadaEn: fila.creadaEn,
        quiereFinanciamiento: fila.quiereFinanciamiento,
        mensaje: fila.mensaje,
        paso: fila.paso as PasoSolicitud,
        proximaAccion:
          fila.proximaAccion && fila.proximaAccionEn
            ? { texto: fila.proximaAccion, en: fila.proximaAccionEn }
            : null,
        propiedad: {
          id: fila.propiedadId,
          titulo: fila.titulo,
          direccion: fila.direccion,
          ciudad: fila.ciudad,
          tipo: fila.tipo,
          modalidad: fila.modalidad,
          publicada: fila.activo && fila.estadoPublicacion === "publicada",
        },
        oferente: {
          id: fila.oferenteId,
          nombre: fila.oferenteNombre,
          agencia: contacto.agenciaNombre,
          email: contacto.email ?? fila.oferenteEmail,
          telefono: contacto.telefono,
          whatsapp: contacto.whatsapp,
          esBroker: fila.oferenteEsBroker,
          brokerCode: fila.oferenteBrokerCode,
        },
        brokerReferido: fila.brokerNombre,
      };
    }),
  );

  const autor = alias(usuario, "autor");
  const notas = await db
    .select({
      id: seguimientoNota.id,
      tipo: seguimientoNota.tipo,
      texto: seguimientoNota.texto,
      creadaEn: seguimientoNota.createdAt,
      autor: autor.nombre,
      contactRequestId: seguimientoNota.contactRequestId,
    })
    .from(seguimientoNota)
    .innerJoin(autor, eq(seguimientoNota.autorId, autor.id))
    .where(eq(seguimientoNota.buscadorId, buscadorId))
    .orderBy(desc(seguimientoNota.createdAt));

  return {
    id: cliente.id,
    nombre: cliente.nombre,
    email: cliente.email,
    telefono: cliente.telefono,
    registradoEn: cliente.registradoEn,
    estado: estadoDeCliente(solicitudes.filter((s) => s.canal === "captive").map((s) => s.paso)),
    solicitudes,
    notas: notas.map((nota) => ({ ...nota, tipo: nota.tipo as TipoNota })),
  };
}

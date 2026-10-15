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
import { type DetallesPropiedad, extraerDetalles } from "../../lib/property-details.ts";
import { obtenerContactoPublico } from "../agency/queries.ts";
import { requireRol } from "../auth/guards.ts";
import type { ActorAutenticado } from "../auth/session.ts";

// Detalle de un cliente en "Clientes y prospectos": sus solicitudes (con el paso del seguimiento y
// el contacto del propietario) y la bitácora. Solo admin.

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
    // Precio capturado por el propietario: solo lo ve Captive, para cotizar.
    precio: number | null;
    moneda: string;
    precioUnidad: string;
    // Medidas, datos de nave o local y equipamiento, para responderle al cliente.
    detalles: DetallesPropiedad;
  };
  // A quién hay que llamarle para confirmar la disponibilidad.
  propietario: {
    id: string;
    nombre: string;
    agencia: string;
    email: string;
    telefono: string | null;
    whatsapp: string | null;
    esBroker: boolean;
    brokerCode: string | null;
    numeroPropietario: number | null;
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

  const propietario = alias(usuario, "propietario");
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
      precio: propiedad.precio,
      moneda: propiedad.moneda,
      precioUnidad: propiedad.precioUnidad,
      detalles: {
        mantenimiento: propiedad.mantenimiento,
        superficieConstruidaM2: propiedad.superficieConstruidaM2,
        superficieTerrenoM2: propiedad.superficieTerrenoM2,
        banos: propiedad.banos,
        estacionamientos: propiedad.estacionamientos,
        alturaLibreM: propiedad.alturaLibreM,
        andenes: propiedad.andenes,
        potenciaKva: propiedad.potenciaKva,
        equipamiento: propiedad.equipamiento,
        oficinasPrivadas: propiedad.oficinasPrivadas,
        frenteM: propiedad.frenteM,
        resistenciaPisoTon: propiedad.resistenciaPisoTon,
      },
      activo: propiedad.activo,
      estadoPublicacion: propiedad.estadoPublicacion,
      contactoId: propiedad.contactoId,
      propietarioId: propietario.id,
      propietarioNombre: propietario.nombre,
      propietarioEmail: propietario.email,
      propietarioEsBroker: propietario.isBroker,
      propietarioBrokerCode: propietario.brokerCode,
      propietarioNumero: propietario.numeroPropietario,
      brokerNombre: broker.nombre,
    })
    .from(contactRequest)
    .innerJoin(propiedad, eq(contactRequest.propiedadId, propiedad.id))
    .innerJoin(propietario, eq(contactRequest.propietarioId, propietario.id))
    .leftJoin(broker, eq(contactRequest.brokerId, broker.id))
    .where(eq(contactRequest.buscadorId, buscadorId))
    .orderBy(desc(contactRequest.createdAt));

  // Un cliente sin solicitudes solo existe aquí si es buscador (los propietarios no son prospectos).
  if (filas.length === 0 && cliente.rol !== "buscador") return null;

  const solicitudes: SolicitudDeCliente[] = await Promise.all(
    filas.map(async (fila) => {
      const contacto = await obtenerContactoPublico(fila.propietarioId, fila.contactoId);
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
          precio: fila.precio,
          moneda: fila.moneda,
          precioUnidad: fila.precioUnidad,
          detalles: extraerDetalles({
            ...fila.detalles,
            precio: fila.precio,
            moneda: fila.moneda,
            precioUnidad: fila.precioUnidad,
          }),
        },
        propietario: {
          id: fila.propietarioId,
          nombre: fila.propietarioNombre,
          agencia: contacto.agenciaNombre,
          email: contacto.email ?? fila.propietarioEmail,
          telefono: contacto.telefono,
          whatsapp: contacto.whatsapp,
          esBroker: fila.propietarioEsBroker,
          brokerCode: fila.propietarioBrokerCode,
          numeroPropietario: fila.propietarioNumero,
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

import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { EstadoCliente, ParamsClientes, TipoNota } from "../../lib/clientes.ts";
import { POR_PAGINA_CLIENTES } from "../../lib/clientes.ts";
import { db } from "../../lib/db/client.ts";
import {
  contactRequest,
  propiedad,
  seguimientoCliente,
  seguimientoNota,
  usuario,
} from "../../lib/db/schema.ts";
import { obtenerContactoPublico } from "../agency/queries.ts";
import { requireRol } from "../auth/guards.ts";
import type { ActorAutenticado } from "../auth/session.ts";

// "Clientes y prospectos" (panel de administración): los buscadores registrados y lo que pidieron.
// Solo admin: cualquier otro actor recibe `null`/vacío, igual que un recurso que no existe.

export interface ClienteResumen {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  registradoEn: Date;
  estado: EstadoCliente;
  // Todas sus solicitudes: las nuevas (canal "captive") y las anteriores que le llegaron directo al
  // oferente, para que Captive vea a todos los que alguna vez pidieron informes.
  solicitudes: number;
  ultimaSolicitud: Date | null;
  quiereFinanciamiento: boolean;
}

export interface ListaClientes {
  clientes: ClienteResumen[];
  total: number;
  porEstado: Record<EstadoCliente, number>;
  pagina: number;
  porPagina: number;
}

function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);
}

function esAdmin(actor: ActorAutenticado | null): boolean {
  return requireRol(actor, "admin").ok;
}

export async function listarClientes(
  actor: ActorAutenticado | null,
  params: ParamsClientes,
): Promise<ListaClientes> {
  const vacia: ListaClientes = {
    clientes: [],
    total: 0,
    porEstado: { pendiente: 0, seguimiento: 0, cerrado: 0 },
    pagina: params.pagina,
    porPagina: POR_PAGINA_CLIENTES,
  };
  if (!esAdmin(actor)) return vacia;

  // Por cliente: cuántas solicitudes hizo (de cualquier canal), la más reciente y si pidió
  // financiamiento.
  const agregados = await db
    .select({
      buscadorId: contactRequest.buscadorId,
      solicitudes: sql<number>`count(*)::int`,
      ultima: sql<Date>`max(${contactRequest.createdAt})`,
      financiamiento: sql<boolean>`bool_or(${contactRequest.quiereFinanciamiento})`,
    })
    .from(contactRequest)
    .groupBy(contactRequest.buscadorId);
  const porCliente = new Map(agregados.map((fila) => [fila.buscadorId, fila]));

  const condiciones = [];
  const conSolicitud = [...porCliente.keys()];
  if (params.vista === "solicitudes") {
    if (conSolicitud.length === 0) return vacia;
    condiciones.push(inArray(usuario.id, conSolicitud));
  } else {
    // Un buscador que después pasó a oferente sigue apareciendo si ya había pedido informes.
    const filtroRol =
      conSolicitud.length > 0
        ? or(eq(usuario.rol, "buscador"), inArray(usuario.id, conSolicitud))
        : eq(usuario.rol, "buscador");
    if (filtroRol) condiciones.push(filtroRol);
  }
  if (params.q) {
    const patron = `%${escaparLike(params.q)}%`;
    const coincidencia = or(
      ilike(usuario.nombre, patron),
      ilike(usuario.email, patron),
      ilike(usuario.telefono, patron),
    );
    if (coincidencia) condiciones.push(coincidencia);
  }

  const filas = await db
    .select({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      telefono: usuario.telefono,
      registradoEn: usuario.createdAt,
      estado: seguimientoCliente.estado,
    })
    .from(usuario)
    .leftJoin(seguimientoCliente, eq(seguimientoCliente.buscadorId, usuario.id))
    .where(and(...condiciones));

  const todos: ClienteResumen[] = filas.map((fila) => {
    const agregado = porCliente.get(fila.id);
    return {
      id: fila.id,
      nombre: fila.nombre,
      email: fila.email,
      telefono: fila.telefono,
      registradoEn: fila.registradoEn,
      estado: (fila.estado ?? "pendiente") as EstadoCliente,
      solicitudes: agregado?.solicitudes ?? 0,
      ultimaSolicitud: agregado ? new Date(agregado.ultima) : null,
      quiereFinanciamiento: agregado?.financiamiento ?? false,
    };
  });
  // Primero quien pidió informes más recientemente; luego los registrados más nuevos.
  todos.sort(
    (a, b) =>
      (b.ultimaSolicitud?.getTime() ?? 0) - (a.ultimaSolicitud?.getTime() ?? 0) ||
      b.registradoEn.getTime() - a.registradoEn.getTime(),
  );

  const porEstado: Record<EstadoCliente, number> = { pendiente: 0, seguimiento: 0, cerrado: 0 };
  for (const cliente of todos) porEstado[cliente.estado] += 1;

  const filtrados = params.estado ? todos.filter((c) => c.estado === params.estado) : todos;
  const inicio = (params.pagina - 1) * POR_PAGINA_CLIENTES;
  return {
    clientes: filtrados.slice(inicio, inicio + POR_PAGINA_CLIENTES),
    total: filtrados.length,
    porEstado,
    pagina: params.pagina,
    porPagina: POR_PAGINA_CLIENTES,
  };
}

// Contador del menú lateral: clientes con solicitudes para Captive que siguen pendientes.
export async function contarClientesPendientes(): Promise<number> {
  const [fila] = await db
    .select({ total: sql<number>`count(distinct ${contactRequest.buscadorId})::int` })
    .from(contactRequest)
    .leftJoin(seguimientoCliente, eq(seguimientoCliente.buscadorId, contactRequest.buscadorId))
    .where(
      and(
        eq(contactRequest.canal, "captive"),
        sql`coalesce(${seguimientoCliente.estado}, 'pendiente') = 'pendiente'`,
      ),
    );
  return fila?.total ?? 0;
}

export interface SolicitudDeCliente {
  id: string;
  canal: "directo" | "captive";
  creadaEn: Date;
  quiereFinanciamiento: boolean;
  mensaje: string | null;
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
  estado: EstadoCliente;
  solicitudes: SolicitudDeCliente[];
  notas: NotaDeSeguimiento[];
}

export async function obtenerCliente(
  actor: ActorAutenticado | null,
  buscadorId: string,
): Promise<DetalleCliente | null> {
  if (!esAdmin(actor)) return null;

  const [cliente] = await db
    .select({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      telefono: usuario.telefono,
      rol: usuario.rol,
      registradoEn: usuario.createdAt,
      estado: seguimientoCliente.estado,
    })
    .from(usuario)
    .leftJoin(seguimientoCliente, eq(seguimientoCliente.buscadorId, usuario.id))
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
    estado: (cliente.estado ?? "pendiente") as EstadoCliente,
    solicitudes,
    notas: notas.map((nota) => ({ ...nota, tipo: nota.tipo as TipoNota })),
  };
}

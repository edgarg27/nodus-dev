import { and, asc, eq, ilike, inArray, isNotNull, lte, notInArray, or } from "drizzle-orm";
import {
  type EstadoCliente,
  estadoDeCliente,
  finDelDia,
  PASOS_TERMINADOS,
  type ParamsClientes,
  type PasoSolicitud,
  POR_PAGINA_CLIENTES,
} from "../../lib/clientes.ts";
import { db } from "../../lib/db/client.ts";
import { contactRequest, propiedad, usuario } from "../../lib/db/schema.ts";
import { requireRol } from "../auth/guards.ts";
import type { ActorAutenticado } from "../auth/session.ts";
import { clientesConMensajesSinLeer } from "../messages/captive.ts";

// "Clientes y prospectos" (panel de administración): los buscadores registrados y lo que pidieron.
// Solo admin: cualquier otro actor recibe vacío, igual que un recurso que no existe. El detalle de
// un cliente vive en ./detalle.ts.

export interface ClienteResumen {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  registradoEn: Date;
  // Calculada de los pasos de sus solicitudes para Captive; `null` si no tiene ninguna.
  estado: EstadoCliente | null;
  // Todas sus solicitudes: las nuevas (canal "captive") y las anteriores que le llegaron directo al
  // oferente, para que Captive vea a todos los que alguna vez pidieron informes.
  solicitudes: number;
  ultimaSolicitud: Date | null;
  quiereFinanciamiento: boolean;
  // La próxima acción más cercana de sus solicitudes abiertas.
  proximaAccion: { texto: string; en: Date } | null;
  // Mensajes del cliente en el chat con Captive que nadie ha leído.
  mensajesSinLeer: number;
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

interface Agregado {
  solicitudes: number;
  ultima: Date;
  financiamiento: boolean;
  pasosCaptive: PasoSolicitud[];
  proximaAccion: { texto: string; en: Date } | null;
}

// Por cliente: cuántas solicitudes hizo, la más reciente, si pidió financiamiento, los pasos de las
// que son para Captive y su próxima acción más cercana.
async function agregarPorCliente(): Promise<Map<string, Agregado>> {
  const filas = await db
    .select({
      buscadorId: contactRequest.buscadorId,
      canal: contactRequest.canal,
      paso: contactRequest.paso,
      proximaAccion: contactRequest.proximaAccion,
      proximaAccionEn: contactRequest.proximaAccionEn,
      quiereFinanciamiento: contactRequest.quiereFinanciamiento,
      createdAt: contactRequest.createdAt,
    })
    .from(contactRequest);

  const mapa = new Map<string, Agregado>();
  for (const fila of filas) {
    let agregado = mapa.get(fila.buscadorId);
    if (!agregado) {
      agregado = {
        solicitudes: 0,
        ultima: fila.createdAt,
        financiamiento: false,
        pasosCaptive: [],
        proximaAccion: null,
      };
      mapa.set(fila.buscadorId, agregado);
    }
    agregado.solicitudes += 1;
    if (fila.createdAt > agregado.ultima) agregado.ultima = fila.createdAt;
    agregado.financiamiento ||= fila.quiereFinanciamiento;
    if (fila.canal !== "captive") continue;
    const paso = fila.paso as PasoSolicitud;
    agregado.pasosCaptive.push(paso);
    if (
      fila.proximaAccion &&
      fila.proximaAccionEn &&
      !PASOS_TERMINADOS.includes(paso) &&
      (!agregado.proximaAccion || fila.proximaAccionEn < agregado.proximaAccion.en)
    ) {
      agregado.proximaAccion = { texto: fila.proximaAccion, en: fila.proximaAccionEn };
    }
  }
  return mapa;
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

  const porCliente = await agregarPorCliente();
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
    })
    .from(usuario)
    .where(and(...condiciones));

  const sinLeer = await clientesConMensajesSinLeer(filas.map((fila) => fila.id));
  const todos: ClienteResumen[] = filas.map((fila) => {
    const agregado = porCliente.get(fila.id);
    return {
      ...fila,
      estado: estadoDeCliente(agregado?.pasosCaptive ?? []),
      solicitudes: agregado?.solicitudes ?? 0,
      ultimaSolicitud: agregado?.ultima ?? null,
      quiereFinanciamiento: agregado?.financiamiento ?? false,
      proximaAccion: agregado?.proximaAccion ?? null,
      mensajesSinLeer: sinLeer.get(fila.id) ?? 0,
    };
  });
  // Primero quien tiene mensajes sin leer; luego quien pidió informes más recientemente; luego los
  // registrados más nuevos.
  todos.sort(
    (a, b) =>
      Number(b.mensajesSinLeer > 0) - Number(a.mensajesSinLeer > 0) ||
      (b.ultimaSolicitud?.getTime() ?? 0) - (a.ultimaSolicitud?.getTime() ?? 0) ||
      b.registradoEn.getTime() - a.registradoEn.getTime(),
  );

  const porEstado: Record<EstadoCliente, number> = { pendiente: 0, seguimiento: 0, cerrado: 0 };
  for (const cliente of todos) if (cliente.estado) porEstado[cliente.estado] += 1;

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

export interface AccionPendiente {
  solicitudId: string;
  clienteId: string;
  clienteNombre: string;
  espacio: string;
  paso: PasoSolicitud;
  texto: string;
  en: Date;
  vencida: boolean;
}

// Próximas acciones de hoy y vencidas, de la más antigua a la más nueva (solo solicitudes abiertas).
export async function listarAccionesPendientes(
  actor: ActorAutenticado | null,
  ahora: Date = new Date(),
): Promise<AccionPendiente[]> {
  if (!esAdmin(actor)) return [];
  const filas = await db
    .select({
      solicitudId: contactRequest.id,
      clienteId: usuario.id,
      clienteNombre: usuario.nombre,
      titulo: propiedad.titulo,
      direccion: propiedad.direccion,
      paso: contactRequest.paso,
      texto: contactRequest.proximaAccion,
      en: contactRequest.proximaAccionEn,
    })
    .from(contactRequest)
    .innerJoin(usuario, eq(contactRequest.buscadorId, usuario.id))
    .innerJoin(propiedad, eq(contactRequest.propiedadId, propiedad.id))
    .where(
      and(
        eq(contactRequest.canal, "captive"),
        notInArray(contactRequest.paso, [...PASOS_TERMINADOS]),
        isNotNull(contactRequest.proximaAccion),
        lte(contactRequest.proximaAccionEn, finDelDia(ahora)),
      ),
    )
    .orderBy(asc(contactRequest.proximaAccionEn));

  return filas.map((fila) => ({
    solicitudId: fila.solicitudId,
    clienteId: fila.clienteId,
    clienteNombre: fila.clienteNombre,
    espacio: fila.titulo ?? fila.direccion,
    paso: fila.paso as PasoSolicitud,
    texto: fila.texto ?? "",
    en: fila.en ?? ahora,
    vencida: (fila.en ?? ahora) < ahora,
  }));
}

// Contador del menú lateral: clientes con alguna solicitud nueva sin atender o con un recordatorio
// vencido. (Los mensajes sin leer se cuentan aparte, en "Mensajes".)
export async function contarClientesPorAtender(ahora: Date = new Date()): Promise<number> {
  const filas = await db
    .selectDistinct({ buscadorId: contactRequest.buscadorId })
    .from(contactRequest)
    .where(
      and(
        eq(contactRequest.canal, "captive"),
        or(
          eq(contactRequest.paso, "nueva"),
          and(
            notInArray(contactRequest.paso, [...PASOS_TERMINADOS]),
            lte(contactRequest.proximaAccionEn, ahora),
          ),
        ),
      ),
    );
  return filas.length;
}

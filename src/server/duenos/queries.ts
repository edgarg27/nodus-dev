import { and, desc, eq, ilike, inArray, isNull, ne, or } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { propiedad, usuario } from "../../lib/db/schema.ts";
import { requireRol } from "../auth/guards.ts";
import type { ActorAutenticado } from "../auth/session.ts";
import { clientesConMensajesSinLeer } from "../messages/captive.ts";
import { obtenerPrimerasFotos } from "../properties/queries.ts";

// "Dueños" del panel de administración: propietarios que publican sus propios espacios, que no son
// brokers y que Captive ya verificó (aprobó su solicitud de dueño). Solo admin.

export interface ConteoPropiedades {
  publicadas: number;
  pendientes: number;
  rechazadas: number;
}

export interface DuenoResumen {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  registradoEn: Date;
  propiedades: ConteoPropiedades;
  // Mensajes del dueño en el chat con Captive que nadie ha leído.
  mensajesSinLeer: number;
}

export interface PropiedadDeDueno {
  id: string;
  titulo: string | null;
  direccion: string;
  ciudad: string;
  tipo: string;
  modalidad: string;
  estadoPublicacion: "pendiente" | "publicada" | "rechazada";
  fotoUrl: string | null;
}

export interface DetalleDueno extends Omit<DuenoResumen, "propiedades" | "mensajesSinLeer"> {
  // false mientras su solicitud de dueño siga pendiente (o si la denegaron).
  verificado: boolean;
  propiedades: PropiedadDeDueno[];
}

function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);
}

// Propietario que publica lo suyo: no es broker ni eligió "Soy broker". La lista solo muestra a los
// verificados; la ficha abre también a los pendientes (se llega desde Mensajes o Solicitudes).
const esDueno = and(
  eq(usuario.rol, "propietario"),
  eq(usuario.isBroker, false),
  or(isNull(usuario.tipoAnunciante), ne(usuario.tipoAnunciante, "inmobiliaria")),
);
const esDuenoVerificado = and(esDueno, eq(usuario.duenoVerificado, true));

async function conteosPorDueno(ids: string[]): Promise<Map<string, ConteoPropiedades>> {
  const mapa = new Map<string, ConteoPropiedades>();
  if (ids.length === 0) return mapa;
  const filas = await db
    .select({ propietarioId: propiedad.propietarioId, estado: propiedad.estadoPublicacion })
    .from(propiedad)
    .where(and(inArray(propiedad.propietarioId, ids), eq(propiedad.activo, true)));
  for (const fila of filas) {
    const conteo = mapa.get(fila.propietarioId) ?? { publicadas: 0, pendientes: 0, rechazadas: 0 };
    if (fila.estado === "publicada") conteo.publicadas += 1;
    else if (fila.estado === "pendiente") conteo.pendientes += 1;
    else conteo.rechazadas += 1;
    mapa.set(fila.propietarioId, conteo);
  }
  return mapa;
}

// Los más nuevos primero; quien tiene mensajes sin leer, arriba.
export async function listarDuenos(
  actor: ActorAutenticado | null,
  q = "",
): Promise<DuenoResumen[]> {
  if (!requireRol(actor, "admin").ok) return [];
  const texto = q.trim();
  const busqueda = texto
    ? or(
        ilike(usuario.nombre, `%${escaparLike(texto)}%`),
        ilike(usuario.email, `%${escaparLike(texto)}%`),
        ilike(usuario.telefono, `%${escaparLike(texto)}%`),
      )
    : undefined;
  const filas = await db
    .select({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      telefono: usuario.telefono,
      registradoEn: usuario.createdAt,
    })
    .from(usuario)
    .where(and(esDuenoVerificado, busqueda))
    .orderBy(desc(usuario.createdAt));

  const ids = filas.map((fila) => fila.id);
  const [conteos, sinLeer] = await Promise.all([
    conteosPorDueno(ids),
    clientesConMensajesSinLeer(ids),
  ]);
  return filas
    .map((fila) => ({
      ...fila,
      propiedades: conteos.get(fila.id) ?? { publicadas: 0, pendientes: 0, rechazadas: 0 },
      mensajesSinLeer: sinLeer.get(fila.id) ?? 0,
    }))
    .sort((a, b) => Number(b.mensajesSinLeer > 0) - Number(a.mensajesSinLeer > 0));
}

export async function obtenerDueno(
  actor: ActorAutenticado | null,
  id: string,
): Promise<DetalleDueno | null> {
  if (!requireRol(actor, "admin").ok) return null;
  const [dueno] = await db
    .select({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      telefono: usuario.telefono,
      registradoEn: usuario.createdAt,
      verificado: usuario.duenoVerificado,
    })
    .from(usuario)
    .where(and(eq(usuario.id, id), esDueno));
  if (!dueno) return null;

  const filas = await db
    .select({
      id: propiedad.id,
      titulo: propiedad.titulo,
      direccion: propiedad.direccion,
      ciudad: propiedad.ciudad,
      tipo: propiedad.tipo,
      modalidad: propiedad.modalidad,
      estadoPublicacion: propiedad.estadoPublicacion,
    })
    .from(propiedad)
    .where(and(eq(propiedad.propietarioId, id), eq(propiedad.activo, true)))
    .orderBy(desc(propiedad.createdAt));
  const fotos = await obtenerPrimerasFotos(filas.map((fila) => fila.id));

  return {
    ...dueno,
    propiedades: filas.map((fila) => ({
      ...fila,
      estadoPublicacion: fila.estadoPublicacion as PropiedadDeDueno["estadoPublicacion"],
      fotoUrl: fotos.get(fila.id)?.storageUrl ?? null,
    })),
  };
}

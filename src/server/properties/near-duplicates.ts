import { and, between, eq, ne } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { propiedad } from "../../lib/db/schema.ts";
import {
  cajaAlrededor,
  distanciaEnMetros,
  RADIO_POSIBLE_DUPLICADO_M,
} from "../../lib/distancia.ts";
import { nombresDeAgencia } from "../agency/queries.ts";
import { obtenerPrimerasFotos } from "./queries.ts";

// "Posibles duplicados": propiedades vigentes del mismo tipo a pocos metros. Complementa al chequeo
// exacto de duplicate-check.ts (que sí bloquea): aquí solo se AVISA, porque dos espacios distintos
// pueden compartir edificio. Mismo criterio de vigencia que el índice único: activa y no rechazada.

export interface PropiedadCercana {
  id: string;
  propietarioId: string;
  titulo: string | null;
  direccion: string;
  ciudad: string;
  modalidad: string;
  estadoPublicacion: "pendiente" | "publicada";
  // Metros al punto consultado, redondeados.
  distanciaM: number;
  fotoUrl: string | null;
}

export interface CriterioCercania {
  lat: number;
  lng: number;
  tipo: string;
  // Deja fuera a la propia fila (edición, o la pendiente que se está revisando).
  excluirId?: string;
}

export async function buscarPropiedadesCercanas(
  criterio: CriterioCercania,
): Promise<PropiedadCercana[]> {
  const caja = cajaAlrededor(criterio, RADIO_POSIBLE_DUPLICADO_M);
  const condiciones = [
    eq(propiedad.activo, true),
    ne(propiedad.estadoPublicacion, "rechazada"),
    eq(propiedad.tipo, criterio.tipo),
    between(propiedad.lat, String(caja.latMin), String(caja.latMax)),
    between(propiedad.lng, String(caja.lngMin), String(caja.lngMax)),
  ];
  if (criterio.excluirId) condiciones.push(ne(propiedad.id, criterio.excluirId));

  const filas = await db
    .select({
      id: propiedad.id,
      propietarioId: propiedad.propietarioId,
      titulo: propiedad.titulo,
      direccion: propiedad.direccion,
      ciudad: propiedad.ciudad,
      modalidad: propiedad.modalidad,
      estadoPublicacion: propiedad.estadoPublicacion,
      lat: propiedad.lat,
      lng: propiedad.lng,
    })
    .from(propiedad)
    .where(and(...condiciones));

  const cercanas = filas
    .map((fila) => ({
      ...fila,
      distanciaM: distanciaEnMetros(criterio, { lat: Number(fila.lat), lng: Number(fila.lng) }),
    }))
    .filter((fila) => fila.distanciaM <= RADIO_POSIBLE_DUPLICADO_M)
    .sort((a, b) => a.distanciaM - b.distanciaM);
  if (cercanas.length === 0) return [];

  const fotos = await obtenerPrimerasFotos(cercanas.map((fila) => fila.id));
  return cercanas.map((fila) => ({
    id: fila.id,
    propietarioId: fila.propietarioId,
    titulo: fila.titulo,
    direccion: fila.direccion,
    ciudad: fila.ciudad,
    modalidad: fila.modalidad,
    estadoPublicacion: fila.estadoPublicacion as PropiedadCercana["estadoPublicacion"],
    distanciaM: Math.round(fila.distanciaM),
    fotoUrl: fotos.get(fila.id)?.storageUrl ?? null,
  }));
}

// Lo que ve QUIEN PUBLICA de cada propiedad parecida. De una ajena que todavía no es pública solo
// se dice la dirección (sin foto, título ni liga): nada que aún no esté publicado se revela.
export interface PosibleDuplicadoParaPropietario {
  id: string | null;
  titulo: string | null;
  direccion: string;
  ciudad: string;
  fotoUrl: string | null;
  distanciaM: number;
  esMia: boolean;
  publicada: boolean;
}

export function paraPropietario(
  cercanas: PropiedadCercana[],
  propietarioId: string,
): PosibleDuplicadoParaPropietario[] {
  return cercanas.map((cercana) => {
    const esMia = cercana.propietarioId === propietarioId;
    const publicada = cercana.estadoPublicacion === "publicada";
    const visible = esMia || publicada;
    return {
      id: visible ? cercana.id : null,
      titulo: visible ? cercana.titulo : null,
      direccion: cercana.direccion,
      ciudad: cercana.ciudad,
      fotoUrl: visible ? cercana.fotoUrl : null,
      distanciaM: cercana.distanciaM,
      esMia,
      publicada,
    };
  });
}

// Lo que ve EL ADMIN de cada propiedad parecida a una que está revisando.
export interface ParecidaParaAdmin {
  id: string;
  titulo: string | null;
  direccion: string;
  estadoPublicacion: "pendiente" | "publicada";
  distanciaM: number;
  // Quién la publicó (agencia o persona).
  propietario: string;
}

// Posibles duplicados de cada propiedad pendiente de revisión, por id. Las que no tienen ninguno no
// aparecen en el Map.
export async function posiblesDuplicadosDePendientes(
  pendientes: { id: string; lat: string; lng: string; tipo: string }[],
): Promise<Map<string, ParecidaParaAdmin[]>> {
  const porPropiedad = new Map<string, PropiedadCercana[]>();
  await Promise.all(
    pendientes.map(async (pendiente) => {
      const cercanas = await buscarPropiedadesCercanas({
        lat: Number(pendiente.lat),
        lng: Number(pendiente.lng),
        tipo: pendiente.tipo,
        excluirId: pendiente.id,
      });
      if (cercanas.length > 0) porPropiedad.set(pendiente.id, cercanas);
    }),
  );
  const nombres = await nombresDeAgencia(
    [...porPropiedad.values()].flat().map((cercana) => cercana.propietarioId),
  );
  return new Map(
    [...porPropiedad].map(([id, cercanas]) => [
      id,
      cercanas.map((cercana) => ({
        id: cercana.id,
        titulo: cercana.titulo,
        direccion: cercana.direccion,
        estadoPublicacion: cercana.estadoPublicacion,
        distanciaM: cercana.distanciaM,
        propietario: nombres.get(cercana.propietarioId) ?? "",
      })),
    ]),
  );
}

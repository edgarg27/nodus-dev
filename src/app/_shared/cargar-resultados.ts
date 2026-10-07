import type { SearchResultProperty } from "@/components/properties/search-results";
import { extraerDetalles } from "@/lib/property-details";
import { busquedaAParams, type FiltrosBusqueda, type OrdenBusqueda } from "@/lib/search-params";
import { getUsuarioActual } from "@/server/auth/session";
import { idsFavoritos } from "@/server/favorites/favorites";
import {
  buscarPropiedadesPublicas,
  contarPropiedadesPublicas,
  obtenerPrimerasFotos,
} from "@/server/properties/queries";
import { estaGuardada } from "@/server/saved-searches/saved-searches";

// Carga compartida de /buscar y de las páginas por tipo y ciudad: primera página de resultados,
// total, favoritos del usuario y si la búsqueda ya está guardada.
export async function cargarResultados(filtros: FiltrosBusqueda, orden: OrdenBusqueda) {
  const { financiamiento, ...resto } = filtros;
  const filtrosServidor = {
    ...resto,
    aceptaFinanciamiento: financiamiento === undefined ? undefined : financiamiento === "true",
  };

  const consulta = busquedaAParams(filtros, orden).toString();
  const actor = await getUsuarioActual();
  const [resultado, total, favoritos, guardada] = await Promise.all([
    buscarPropiedadesPublicas(filtrosServidor, { orden }),
    contarPropiedadesPublicas(filtrosServidor),
    actor ? idsFavoritos(actor.id) : Promise.resolve([]),
    actor ? estaGuardada(actor.id, consulta) : Promise.resolve(false),
  ]);
  const primerasFotos = await obtenerPrimerasFotos(resultado.data.map((fila) => fila.id));

  const propiedades: SearchResultProperty[] = resultado.data.map((fila) => ({
    id: fila.id,
    direccion: fila.direccion,
    tipo: fila.tipo,
    modalidad: fila.modalidad,
    estado: fila.estado,
    ciudad: fila.ciudad,
    descripcion: fila.descripcion,
    lat: Number(fila.lat),
    lng: Number(fila.lng),
    fotoUrl: primerasFotos.get(fila.id)?.storageUrl ?? null,
    ...extraerDetalles(fila),
  }));

  return {
    consulta,
    autenticado: actor !== null,
    total,
    favoritos,
    guardada,
    propiedades,
    hasMore: resultado.hasMore,
    nextCursor: resultado.nextCursor,
  };
}

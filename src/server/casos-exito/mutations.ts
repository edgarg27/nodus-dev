import { and, eq, ne } from "drizzle-orm";
import { type CasoExito, primerLugarLibre } from "../../lib/casos-exito.ts";
import { db } from "../../lib/db/client.ts";
import { casoExito } from "../../lib/db/schema.ts";
import type { ActorAutenticado } from "../auth/session.ts";
import { esAdmin, LUGAR_OCUPADO, NO_ENCONTRADO, type ResultadoCaso } from "./acceso.ts";
import { borrarFotoDeCaso } from "./foto.ts";
import { listarTodosLosCasos, obtenerCaso } from "./queries.ts";

// Alta, edición y baja de casos de éxito (solo admin, ver acceso.ts). Cada lugar de la portada lo
// ocupa a lo más un caso: se valida aquí y el índice único de la base es el respaldo.

export interface DatosCaso {
  sector: string;
  titulo: string;
  texto: string;
  // Opcionales: nulo o vacío borra la versión en inglés.
  sectorEn?: string | null;
  tituloEn?: string | null;
  textoEn?: string | null;
  // Lugar en la portada (1 a 3); nulo lo saca de la portada.
  posicion?: number | null;
}

const vacioANulo = (valor: string | null | undefined) => valor?.trim() || null;

async function lugarEstaOcupado(posicion: number, ignorarId?: string): Promise<boolean> {
  const [fila] = await db
    .select({ id: casoExito.id })
    .from(casoExito)
    .where(
      ignorarId
        ? and(eq(casoExito.posicion, posicion), ne(casoExito.id, ignorarId))
        : eq(casoExito.posicion, posicion),
    )
    .limit(1);
  return fila !== undefined;
}

// Dos altas o ediciones a la vez pueden pasar la validación; entonces choca el índice único.
function esLugarOcupado(err: unknown): boolean {
  if (typeof err !== "object" || err === null || !("cause" in err)) return false;
  const cause = (err as { cause?: unknown }).cause;
  return (
    typeof cause === "object" && cause !== null && (cause as { code?: string }).code === "23505"
  );
}

export async function crearCaso(
  actor: ActorAutenticado | null,
  datos: DatosCaso,
): Promise<ResultadoCaso<CasoExito>> {
  if (!esAdmin(actor)) return NO_ENCONTRADO;

  // Sin `posicion` explícita, el caso nuevo toma el primer lugar libre (o queda fuera si no hay).
  let posicion: number | null;
  if (datos.posicion === undefined) {
    posicion = primerLugarLibre(await listarTodosLosCasos());
  } else {
    posicion = datos.posicion;
    if (posicion !== null && (await lugarEstaOcupado(posicion))) return LUGAR_OCUPADO;
  }

  try {
    const [fila] = await db
      .insert(casoExito)
      .values({
        sector: datos.sector,
        titulo: datos.titulo,
        texto: datos.texto,
        sectorEn: vacioANulo(datos.sectorEn),
        tituloEn: vacioANulo(datos.tituloEn),
        textoEn: vacioANulo(datos.textoEn),
        posicion,
      })
      .returning({ id: casoExito.id });
    if (!fila) throw new Error("insert de caso_exito no devolvió fila");
    const caso = await obtenerCaso(fila.id);
    if (!caso) throw new Error("caso_exito no encontrado tras el insert");
    return { ok: true, data: caso };
  } catch (err) {
    if (esLugarOcupado(err)) return LUGAR_OCUPADO;
    throw err;
  }
}

// Parche parcial: solo cambia lo que se manda. Idempotente.
export async function editarCaso(
  actor: ActorAutenticado | null,
  id: string,
  parche: Partial<DatosCaso>,
): Promise<ResultadoCaso<CasoExito>> {
  if (!esAdmin(actor)) return NO_ENCONTRADO;
  if (!(await obtenerCaso(id))) return NO_ENCONTRADO;

  if (parche.posicion != null && (await lugarEstaOcupado(parche.posicion, id))) {
    return LUGAR_OCUPADO;
  }

  try {
    await db
      .update(casoExito)
      .set({
        ...(parche.sector !== undefined ? { sector: parche.sector } : {}),
        ...(parche.titulo !== undefined ? { titulo: parche.titulo } : {}),
        ...(parche.texto !== undefined ? { texto: parche.texto } : {}),
        ...(parche.sectorEn !== undefined ? { sectorEn: vacioANulo(parche.sectorEn) } : {}),
        ...(parche.tituloEn !== undefined ? { tituloEn: vacioANulo(parche.tituloEn) } : {}),
        ...(parche.textoEn !== undefined ? { textoEn: vacioANulo(parche.textoEn) } : {}),
        ...(parche.posicion !== undefined ? { posicion: parche.posicion } : {}),
      })
      .where(eq(casoExito.id, id));
  } catch (err) {
    if (esLugarOcupado(err)) return LUGAR_OCUPADO;
    throw err;
  }
  const caso = await obtenerCaso(id);
  if (!caso) return NO_ENCONTRADO;
  return { ok: true, data: caso };
}

// Borra el caso y su foto del almacenamiento. Un caso que ya no existe responde 404.
export async function borrarCaso(
  actor: ActorAutenticado | null,
  id: string,
): Promise<ResultadoCaso<{ id: string }>> {
  if (!esAdmin(actor)) return NO_ENCONTRADO;
  const caso = await obtenerCaso(id);
  if (!caso) return NO_ENCONTRADO;

  await db.delete(casoExito).where(eq(casoExito.id, id));
  await borrarFotoDeCaso(caso.fotoUrl);
  return { ok: true, data: { id } };
}

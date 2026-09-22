import { randomUUID } from "node:crypto";
import { eq, max } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { propiedad, propiedadFoto } from "../../lib/db/schema.ts";
import { crearClienteAdmin } from "../supabase/admin.ts";

const BUCKET = "propiedades-fotos";
const TIPOS_PERMITIDOS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
// 4 000 000 bytes: el mismo tope que impone el bucket (paso 11) y el cuerpo de una Vercel Function
// (4,5 MB) admite de sobra. Sin compresión ni redimensionado en v1 (§20.3).
const TAMANO_MAXIMO = 4_000_000;

export interface ArchivoFoto {
  buffer: Buffer;
  contentType: string;
}

export type ResultadoAgregarFoto =
  | { ok: true; data: { id: string; storageUrl: string; orden: number } }
  | { ok: false; error: { code: "validation_error"; status: 422; message: string } };

export type ResultadoQuitarFoto =
  | { ok: true }
  | { ok: false; error: { code: "not_found"; status: 404; message: string } };

// Agregar o quitar una foto de una propiedad `publicada` o `rechazada` la devuelve a `pendiente`
// y limpia la revisión, en la misma transacción que la fila de `propiedad_foto` (§14).
async function reenviarARevisionSiHaceFalta(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  propiedadId: string,
) {
  const [prop] = await tx.select().from(propiedad).where(eq(propiedad.id, propiedadId));
  if (prop && (prop.estadoPublicacion === "publicada" || prop.estadoPublicacion === "rechazada")) {
    await tx
      .update(propiedad)
      .set({
        estadoPublicacion: "pendiente",
        motivoRechazo: null,
        revisadaPor: null,
        revisadaEn: null,
      })
      .where(eq(propiedad.id, propiedadId));
  }
}

export async function agregarFotoPropiedad(
  propiedadId: string,
  archivo: ArchivoFoto,
): Promise<ResultadoAgregarFoto> {
  const extension = TIPOS_PERMITIDOS[archivo.contentType];
  if (!extension) {
    return {
      ok: false,
      error: { code: "validation_error", status: 422, message: "Tipo de archivo no permitido" },
    };
  }
  if (archivo.buffer.byteLength > TAMANO_MAXIMO) {
    return {
      ok: false,
      error: { code: "validation_error", status: 422, message: "El archivo supera 4 MB" },
    };
  }

  const admin = crearClienteAdmin();
  const ruta = `${propiedadId}/${randomUUID()}.${extension}`;
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(ruta, archivo.buffer, { contentType: archivo.contentType });
  if (error) {
    return { ok: false, error: { code: "validation_error", status: 422, message: error.message } };
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(ruta);

  const fila = await db.transaction(async (tx) => {
    const [filaOrden] = await tx
      .select({ maximo: max(propiedadFoto.orden) })
      .from(propiedadFoto)
      .where(eq(propiedadFoto.propiedadId, propiedadId));
    const orden = (filaOrden?.maximo ?? -1) + 1;

    const [nuevaFoto] = await tx
      .insert(propiedadFoto)
      .values({ propiedadId, storageUrl: data.publicUrl, orden })
      .returning();
    if (!nuevaFoto) throw new Error("insert de propiedad_foto no devolvió fila");

    await reenviarARevisionSiHaceFalta(tx, propiedadId);
    return nuevaFoto;
  });

  return { ok: true, data: { id: fila.id, storageUrl: fila.storageUrl, orden: fila.orden } };
}

export async function quitarFotoPropiedad(fotoId: string): Promise<ResultadoQuitarFoto> {
  const [foto] = await db.select().from(propiedadFoto).where(eq(propiedadFoto.id, fotoId));
  if (!foto) {
    return { ok: false, error: { code: "not_found", status: 404, message: "Foto no encontrada" } };
  }

  const admin = crearClienteAdmin();
  const marcador = `/public/${BUCKET}/`;
  const indice = foto.storageUrl.indexOf(marcador);
  if (indice !== -1) {
    const ruta = foto.storageUrl.slice(indice + marcador.length);
    await admin.storage.from(BUCKET).remove([ruta]);
  }

  await db.transaction(async (tx) => {
    await tx.delete(propiedadFoto).where(eq(propiedadFoto.id, fotoId));
    await reenviarARevisionSiHaceFalta(tx, foto.propiedadId);
  });

  return { ok: true };
}

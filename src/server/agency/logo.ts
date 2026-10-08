import { randomUUID } from "node:crypto";
import { db } from "../../lib/db/client.ts";
import { agenciaPerfil } from "../../lib/db/schema.ts";
import { requireRol } from "../auth/guards.ts";
import type { ActorAutenticado } from "../auth/session.ts";
import { crearClienteAdmin } from "../supabase/admin.ts";
import { obtenerPerfilAgencia } from "./queries.ts";

// Logo de la agencia: se guarda en el mismo bucket público de las fotos, bajo `agencias/<usuario>/`,
// y su URL en `agencia_perfil.logo_url`. Se muestra en la ficha pública de cada propiedad.

const BUCKET = "propiedades-fotos";
const CARPETA = "agencias";
const TIPOS_PERMITIDOS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
// El mismo tope que las fotos de las propiedades (y el del bucket).
const TAMANO_MAXIMO = 4_000_000;

export type ResultadoLogo =
  | { ok: true; data: { logoUrl: string | null } }
  | {
      ok: false;
      error:
        | { code: "forbidden"; status: 403; message: string }
        | { code: "validation_error"; status: 422; message: string };
    };

const SIN_PERMISO: ResultadoLogo = {
  ok: false,
  error: { code: "forbidden", status: 403, message: "Se requiere el rol oferente" },
};

// Ruta dentro del bucket a partir de la URL pública, solo si es un logo de este usuario.
function rutaDelLogo(logoUrl: string | null, usuarioId: string): string | null {
  if (!logoUrl) return null;
  const marcador = `/${BUCKET}/${CARPETA}/${usuarioId}/`;
  const inicio = logoUrl.indexOf(marcador);
  return inicio === -1 ? null : logoUrl.slice(inicio + `/${BUCKET}/`.length);
}

// Un perfil por oferente: si aún no lo creó, el logo lo crea con su nombre de cuenta.
async function guardarLogoUrl(usuarioId: string, logoUrl: string | null) {
  const perfil = await obtenerPerfilAgencia(usuarioId);
  await db
    .insert(agenciaPerfil)
    .values({ usuarioId, nombre: perfil.nombre || "Agencia", logoUrl })
    .onConflictDoUpdate({ target: agenciaPerfil.usuarioId, set: { logoUrl } });
  return perfil.logoUrl;
}

export async function subirLogoAgencia(
  actor: ActorAutenticado | null,
  archivo: { buffer: Buffer; contentType: string },
): Promise<ResultadoLogo> {
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) return SIN_PERMISO;

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
  const ruta = `${CARPETA}/${actor.id}/${randomUUID()}.${extension}`;
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(ruta, archivo.buffer, { contentType: archivo.contentType });
  if (error) {
    return { ok: false, error: { code: "validation_error", status: 422, message: error.message } };
  }
  const { data } = admin.storage.from(BUCKET).getPublicUrl(ruta);

  const anterior = await guardarLogoUrl(actor.id, data.publicUrl);
  // El archivo anterior ya no se usa; si no se puede borrar, solo queda huérfano en el bucket.
  const rutaAnterior = rutaDelLogo(anterior, actor.id);
  if (rutaAnterior) await admin.storage.from(BUCKET).remove([rutaAnterior]);

  return { ok: true, data: { logoUrl: data.publicUrl } };
}

export async function quitarLogoAgencia(actor: ActorAutenticado | null): Promise<ResultadoLogo> {
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) return SIN_PERMISO;

  const anterior = await guardarLogoUrl(actor.id, null);
  const rutaAnterior = rutaDelLogo(anterior, actor.id);
  if (rutaAnterior) await crearClienteAdmin().storage.from(BUCKET).remove([rutaAnterior]);
  return { ok: true, data: { logoUrl: null } };
}

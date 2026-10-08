import { and, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { agenciaContacto, agenciaPerfil, propiedad, usuario } from "../../lib/db/schema.ts";

export type AgenciaPerfilFila = typeof agenciaPerfil.$inferSelect;
export type AgenciaContactoFila = typeof agenciaContacto.$inferSelect;

export interface ContactoConPropiedades extends AgenciaContactoFila {
  propiedadesAsociadas: number;
}

// Perfil del oferente; si aún no lo creó, el nombre de su cuenta hace de nombre de agencia.
export async function obtenerPerfilAgencia(usuarioId: string) {
  const [perfil] = await db
    .select()
    .from(agenciaPerfil)
    .where(eq(agenciaPerfil.usuarioId, usuarioId));
  if (perfil)
    return { nombre: perfil.nombre, descripcion: perfil.descripcion, logoUrl: perfil.logoUrl };
  const [cuenta] = await db
    .select({ nombre: usuario.nombre })
    .from(usuario)
    .where(eq(usuario.id, usuarioId));
  return { nombre: cuenta?.nombre ?? "", descripcion: "", logoUrl: null as string | null };
}

// Contactos del oferente con el número de propiedades activas que usan cada uno.
export async function listarContactosDeAgencia(
  usuarioId: string,
): Promise<ContactoConPropiedades[]> {
  const contactos = await db
    .select()
    .from(agenciaContacto)
    .where(eq(agenciaContacto.usuarioId, usuarioId))
    .orderBy(agenciaContacto.tipo, agenciaContacto.createdAt);
  if (contactos.length === 0) return [];

  const usos = await db
    .select({ contactoId: propiedad.contactoId, total: count() })
    .from(propiedad)
    .where(and(eq(propiedad.oferenteId, usuarioId), eq(propiedad.activo, true)))
    .groupBy(propiedad.contactoId);
  const porContacto = new Map(usos.map((uso) => [uso.contactoId, uso.total]));
  return contactos.map((contacto) => ({
    ...contacto,
    propiedadesAsociadas: porContacto.get(contacto.id) ?? 0,
  }));
}

export interface ContactoPublico {
  agenciaNombre: string;
  telefono: string | null;
  whatsapp: string | null;
  email: string | null;
}

// Cómo se contacta al oferente de una propiedad: el contacto que eligió (si lo hay) y, para lo
// que falte, el teléfono de su cuenta. El nombre de la agencia sale del perfil o de la cuenta.
export async function obtenerContactoPublico(
  oferenteId: string,
  contactoId: string | null,
): Promise<ContactoPublico> {
  const perfil = await obtenerPerfilAgencia(oferenteId);
  const [cuenta] = await db
    .select({ telefono: usuario.telefono })
    .from(usuario)
    .where(eq(usuario.id, oferenteId));

  let elegido: AgenciaContactoFila | undefined;
  if (contactoId) {
    [elegido] = await db
      .select()
      .from(agenciaContacto)
      .where(and(eq(agenciaContacto.id, contactoId), eq(agenciaContacto.usuarioId, oferenteId)));
  }

  return {
    agenciaNombre: perfil.nombre,
    telefono: elegido?.tipo === "telefono" ? elegido.valor : (cuenta?.telefono ?? null),
    whatsapp: elegido?.tipo === "whatsapp" ? elegido.valor : null,
    email: elegido?.tipo === "email" ? elegido.valor : null,
  };
}

// Nombres de agencia de varios oferentes a la vez (tarjetas de la Red, chat).
export async function nombresDeAgencia(usuarioIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(usuarioIds)];
  const mapa = new Map<string, string>();
  if (ids.length === 0) return mapa;
  const filas = await db
    .select({
      id: usuario.id,
      nombre: sql<string>`coalesce(${agenciaPerfil.nombre}, ${usuario.nombre})`,
    })
    .from(usuario)
    .leftJoin(agenciaPerfil, eq(agenciaPerfil.usuarioId, usuario.id))
    .where(inArray(usuario.id, ids));
  for (const fila of filas) mapa.set(fila.id, fila.nombre);
  return mapa;
}

// Identidad que se muestra en la ficha pública: nombre de la agencia y si es broker aprobado.
// También alimenta "Información del anunciante": descripción, antigüedad y espacios publicados.
export async function obtenerIdentidadPublica(oferenteId: string) {
  const [perfil, [cuenta], [publicadas]] = await Promise.all([
    obtenerPerfilAgencia(oferenteId),
    db
      .select({ isBroker: usuario.isBroker, createdAt: usuario.createdAt })
      .from(usuario)
      .where(eq(usuario.id, oferenteId)),
    db
      .select({ total: count() })
      .from(propiedad)
      .where(
        and(
          eq(propiedad.oferenteId, oferenteId),
          eq(propiedad.activo, true),
          eq(propiedad.estadoPublicacion, "publicada"),
        ),
      ),
  ]);
  return {
    nombre: perfil.nombre,
    descripcion: perfil.descripcion,
    logoUrl: perfil.logoUrl,
    esBroker: cuenta?.isBroker ?? false,
    miembroDesde: cuenta?.createdAt ?? null,
    espaciosPublicados: publicadas?.total ?? 0,
  };
}

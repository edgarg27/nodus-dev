import { asc } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { testimonio } from "../../lib/db/schema.ts";
import type { Testimonio } from "../../lib/testimonio.ts";

// Hay un solo testimonio: la fila más antigua de la tabla (guardar siempre actualiza esa).
export async function filaDelTestimonio() {
  const [fila] = await db.select().from(testimonio).orderBy(asc(testimonio.createdAt)).limit(1);
  return fila ?? null;
}

// Panel de administración: el testimonio guardado, se muestre o no en la portada.
export async function obtenerTestimonio(): Promise<Testimonio | null> {
  const fila = await filaDelTestimonio();
  if (!fila) return null;
  return {
    cita: fila.cita,
    nombre: fila.nombre,
    cargo: fila.cargo,
    citaEn: fila.citaEn,
    cargoEn: fila.cargoEn,
    visible: fila.visible,
  };
}

// Portada: solo si existe y el admin lo dejó visible.
export async function obtenerTestimonioDePortada(): Promise<Testimonio | null> {
  const guardado = await obtenerTestimonio();
  return guardado?.visible ? guardado : null;
}

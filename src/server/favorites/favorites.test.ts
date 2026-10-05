import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { resetTestDatabase } from "../../../tests/helpers/reset-db.ts";
import { db } from "../../lib/db/client.ts";
import { favorito, propiedad, usuario } from "../../lib/db/schema.ts";
import type { ActorAutenticado } from "../auth/session.ts";
import { agregarFavorito, idsFavoritos, listarFavoritos, quitarFavorito } from "./favorites.ts";

async function crearUsuario(rol: "buscador" | "oferente" = "buscador"): Promise<ActorAutenticado> {
  const id = randomUUID();
  await db
    .insert(usuario)
    .values({ id, email: `nodus-test+${id}@example.com`, nombre: "Usuario de prueba", rol });
  return {
    id,
    email: `nodus-test+${id}@example.com`,
    nombre: "Usuario de prueba",
    rol,
    isBroker: false,
    brokerCode: null,
    referralBrokerId: null,
  };
}

async function crearPropiedad(oferenteId: string, overrides: Record<string, unknown> = {}) {
  const [fila] = await db
    .insert(propiedad)
    .values({
      oferenteId,
      tipo: "oficina",
      modalidad: "renta",
      direccion: `Av. Favorito ${randomUUID()}`,
      direccionNormalizada: `av favorito ${randomUUID()}`,
      lat: "22.150000",
      lng: "-100.970000",
      estado: "SLP",
      ciudad: "San Luis Potosí",
      descripcion: "Oficina de prueba",
      estadoPublicacion: "publicada",
      ...overrides,
    })
    .returning();
  if (!fila) throw new Error("no se insertó la propiedad");
  return fila;
}

describe("favoritos", () => {
  it("agregar es idempotente y quitar también", async () => {
    await resetTestDatabase();
    const oferente = await crearUsuario("oferente");
    const buscador = await crearUsuario();
    const espacio = await crearPropiedad(oferente.id);

    expect((await agregarFavorito(buscador, espacio.id)).ok).toBe(true);
    expect((await agregarFavorito(buscador, espacio.id)).ok).toBe(true);
    const filas = await db.select().from(favorito).where(eq(favorito.usuarioId, buscador.id));
    expect(filas).toHaveLength(1);

    expect((await quitarFavorito(buscador, espacio.id)).ok).toBe(true);
    expect((await quitarFavorito(buscador, espacio.id)).ok).toBe(true);
    expect(await idsFavoritos(buscador.id)).toEqual([]);
  });

  it("no permite marcar un espacio que no es público, ni sin sesión", async () => {
    await resetTestDatabase();
    const oferente = await crearUsuario("oferente");
    const buscador = await crearUsuario();
    const pendiente = await crearPropiedad(oferente.id, { estadoPublicacion: "pendiente" });

    const resultado = await agregarFavorito(buscador, pendiente.id);
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error.status).toBe(404);

    const sinSesion = await agregarFavorito(null, pendiente.id);
    expect(sinSesion.ok).toBe(false);
    if (!sinSesion.ok) expect(sinSesion.error.status).toBe(401);
  });

  it("la lista solo muestra espacios públicos y es de cada usuario", async () => {
    await resetTestDatabase();
    const oferente = await crearUsuario("oferente");
    const ana = await crearUsuario();
    const beto = await crearUsuario();
    const visible = await crearPropiedad(oferente.id);
    const despues = await crearPropiedad(oferente.id);
    await agregarFavorito(ana, visible.id);
    await agregarFavorito(ana, despues.id);
    await agregarFavorito(beto, visible.id);

    // El espacio se da de baja después de marcarlo: deja de listarse, el favorito se conserva.
    await db.update(propiedad).set({ activo: false }).where(eq(propiedad.id, despues.id));

    const listaAna = await listarFavoritos(ana.id);
    expect(listaAna.map((fila) => fila.id)).toEqual([visible.id]);
    expect(await idsFavoritos(ana.id)).toHaveLength(2);
    expect(await idsFavoritos(beto.id, [visible.id, despues.id])).toEqual([visible.id]);
  });
});

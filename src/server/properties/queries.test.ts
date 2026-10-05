import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { resetTestDatabase } from "../../../tests/helpers/reset-db.ts";
import { db } from "../../lib/db/client.ts";
import { propiedad, usuario } from "../../lib/db/schema.ts";
import { buscarPropiedadesPublicas } from "./queries.ts";

async function crearFilaOferente(): Promise<string> {
  const id = randomUUID();
  await db.insert(usuario).values({
    id,
    email: `nodus-test+${id}@example.com`,
    nombre: "Oferente de prueba",
    rol: "oferente",
  });
  return id;
}

function propiedadFixture(oferenteId: string, overrides: Record<string, unknown> = {}) {
  return {
    oferenteId,
    tipo: "nave_industrial" as const,
    modalidad: "renta" as const,
    direccion: `Av. Filtro Financiamiento ${randomUUID()}`,
    direccionNormalizada: `av filtro financiamiento ${randomUUID()}`,
    lat: "22.150000",
    lng: "-100.970000",
    estado: "SLP" as const,
    ciudad: "San Luis Potosí",
    descripcion: "Propiedad de prueba",
    activo: true,
    estadoPublicacion: "publicada" as const,
    ...overrides,
  };
}

describe("buscarPropiedadesPublicas / aceptaFinanciamiento", () => {
  it("con { aceptaFinanciamiento: true } devuelve solo filas con esa columna en true", async () => {
    await resetTestDatabase();
    const oferenteId = await crearFilaOferente();

    const [conFinanciamiento] = await db
      .insert(propiedad)
      .values(propiedadFixture(oferenteId, { aceptaFinanciamiento: true }))
      .returning();
    await db
      .insert(propiedad)
      .values(propiedadFixture(oferenteId, { aceptaFinanciamiento: false }));
    if (!conFinanciamiento) throw new Error("fixture no se creó");

    const { data } = await buscarPropiedadesPublicas({ aceptaFinanciamiento: true });
    expect(data).toHaveLength(1);
    expect(data[0]?.id).toBe(conFinanciamiento.id);
  });

  it("sin el filtro definido devuelve filas con cualquier valor de la columna", async () => {
    await resetTestDatabase();
    const oferenteId = await crearFilaOferente();

    await db.insert(propiedad).values(propiedadFixture(oferenteId, { aceptaFinanciamiento: true }));
    await db
      .insert(propiedad)
      .values(propiedadFixture(oferenteId, { aceptaFinanciamiento: false }));

    const { data } = await buscarPropiedadesPublicas({});
    expect(data).toHaveLength(2);
  });
});

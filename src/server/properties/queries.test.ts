import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { resetTestDatabase } from "../../../tests/helpers/reset-db.ts";
import { db } from "../../lib/db/client.ts";
import { propiedad, usuario } from "../../lib/db/schema.ts";
import { buscarPropiedadesPublicas, listarPropiedadesSimilares } from "./queries.ts";

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

describe("buscarPropiedadesPublicas / precio, superficie y datos", () => {
  async function sembrar() {
    await resetTestDatabase();
    const oferenteId = await crearFilaOferente();
    const filas = await db
      .insert(propiedad)
      .values([
        // A: $30,000 MXN al mes, 300 m², 2 baños
        propiedadFixture(oferenteId, {
          descripcion: "A",
          precio: 30000,
          superficieConstruidaM2: 300,
          banos: 2,
        }),
        // B: $100 MXN por m² × 1,000 m² = $100,000 MXN, nave con 4 andenes
        propiedadFixture(oferenteId, {
          descripcion: "B",
          precio: 100,
          precioUnidad: "m2",
          superficieConstruidaM2: 1000,
          andenes: 4,
        }),
        // C: USD 2,000; no entra a filtros en MXN
        propiedadFixture(oferenteId, {
          descripcion: "C",
          precio: 2000,
          moneda: "USD",
          superficieTerrenoM2: 5000,
        }),
        // D: sin precio ni superficie
        propiedadFixture(oferenteId, { descripcion: "D" }),
      ])
      .returning();
    return filas;
  }

  const descripciones = (data: { descripcion: string }[]) => data.map((fila) => fila.descripcion);

  it("el rango de precio usa el total (precio por m² × superficie) y solo la moneda pedida", async () => {
    await sembrar();
    const { data } = await buscarPropiedadesPublicas({ precioMin: 50000, moneda: "MXN" });
    expect(descripciones(data)).toEqual(["B"]);

    const enUsd = await buscarPropiedadesPublicas({ precioMax: 5000, moneda: "USD" });
    expect(descripciones(enUsd.data)).toEqual(["C"]);
  });

  it("la superficie usa la construida y, si no hay, la de terreno", async () => {
    await sembrar();
    const { data } = await buscarPropiedadesPublicas({ superficieMin: 900 });
    expect(descripciones(data).sort()).toEqual(["B", "C"]);
  });

  it("los mínimos de baños y andenes excluyen los espacios sin dato", async () => {
    await sembrar();
    expect(descripciones((await buscarPropiedadesPublicas({ banosMin: 1 })).data)).toEqual(["A"]);
    expect(descripciones((await buscarPropiedadesPublicas({ andenesMin: 2 })).data)).toEqual(["B"]);
  });

  it("ordena por precio: MXN primero, luego USD y al final sin precio", async () => {
    await sembrar();
    const asc = await buscarPropiedadesPublicas({}, { orden: "precio_asc" });
    expect(descripciones(asc.data)).toEqual(["A", "B", "C", "D"]);
    const desc = await buscarPropiedadesPublicas({}, { orden: "precio_desc" });
    expect(descripciones(desc.data)).toEqual(["B", "A", "C", "D"]);
  });

  it("ordena por superficie de mayor a menor y pagina por posición sin repetir", async () => {
    await sembrar();
    const primera = await buscarPropiedadesPublicas({}, { orden: "superficie_desc", limit: 2 });
    expect(descripciones(primera.data)).toEqual(["C", "B"]);
    expect(primera.hasMore).toBe(true);
    expect(primera.nextCursor).toBe("o:2");

    const segunda = await buscarPropiedadesPublicas(
      {},
      { orden: "superficie_desc", limit: 2, cursor: primera.nextCursor ?? undefined },
    );
    expect(descripciones(segunda.data)).toEqual(["A", "D"]);
    expect(segunda.hasMore).toBe(false);
  });
});

describe("listarPropiedadesSimilares", () => {
  it("devuelve publicadas del mismo tipo y estado, sin la propia, primero la misma modalidad", async () => {
    await resetTestDatabase();
    const oferenteId = await crearFilaOferente();
    const [base] = await db
      .insert(propiedad)
      .values(propiedadFixture(oferenteId, { descripcion: "base" }))
      .returning();
    await db
      .insert(propiedad)
      .values([
        propiedadFixture(oferenteId, { descripcion: "venta", modalidad: "venta" }),
        propiedadFixture(oferenteId, { descripcion: "renta" }),
        propiedadFixture(oferenteId, { descripcion: "oficina", tipo: "oficina" }),
        propiedadFixture(oferenteId, { descripcion: "otro estado", estado: "Guanajuato" }),
        propiedadFixture(oferenteId, { descripcion: "pendiente", estadoPublicacion: "pendiente" }),
      ]);
    if (!base) throw new Error("no se insertó la base");

    const similares = await listarPropiedadesSimilares(base);
    expect(similares.map((fila) => fila.descripcion)).toEqual(["renta", "venta"]);
  });
});

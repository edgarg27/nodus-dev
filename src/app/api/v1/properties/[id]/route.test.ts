import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../../server/auth/session.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../../../../server/auth/session.ts")>();
  return { ...real, getUsuarioActual: vi.fn() };
});

const { getUsuarioActual } = await import("../../../../../server/auth/session.ts");
const { db } = await import("../../../../../lib/db/client.ts");
const { propiedad, usuario } = await import("../../../../../lib/db/schema.ts");
const { resetTestDatabase } = await import("../../../../../../tests/helpers/reset-db.ts");
const { PATCH } = await import("./route.ts");

async function prepararPropiedad(overrides: Record<string, unknown> = {}) {
  await resetTestDatabase();
  const oferente = {
    id: randomUUID(),
    email: `nodus-test+${randomUUID()}@example.com`,
    nombre: "Oferente de prueba",
    rol: "oferente" as const,
    isBroker: false,
    brokerCode: null,
    referralBrokerId: null,
  };
  await db
    .insert(usuario)
    .values({ id: oferente.id, email: oferente.email, nombre: oferente.nombre, rol: "oferente" });
  vi.mocked(getUsuarioActual).mockResolvedValue(oferente);
  const [fila] = await db
    .insert(propiedad)
    .values({
      oferenteId: oferente.id,
      tipo: "nave_industrial",
      modalidad: "renta",
      direccion: `Av. Edición ${randomUUID()}`,
      direccionNormalizada: `av edicion ${randomUUID()}`,
      lat: "22.150000",
      lng: "-100.970000",
      estado: "SLP",
      ciudad: "San Luis Potosí",
      descripcion: "Nave de prueba",
      estadoPublicacion: "publicada",
      revisadaPor: oferente.id,
      revisadaEn: new Date(),
      ...overrides,
    })
    .returning();
  if (!fila) throw new Error("no se insertó la propiedad");
  return fila;
}

async function patch(id: string, body: unknown) {
  const request = new Request(`http://localhost/api/v1/properties/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return PATCH(request, { params: Promise.resolve({ id }) });
}

async function leer(id: string) {
  const [fila] = await db.select().from(propiedad).where(eq(propiedad.id, id));
  return fila;
}

describe("PATCH /api/v1/properties/[id] / datos del espacio", () => {
  it("guarda el cambio de financiamiento (antes la API lo descartaba)", async () => {
    const fila = await prepararPropiedad();
    const respuesta = await patch(fila.id, { aceptaFinanciamiento: true });
    expect(respuesta.status).toBe(200);
    expect((await leer(fila.id))?.aceptaFinanciamiento).toBe(true);
  });

  it("actualiza el precio sin devolver la propiedad a revisión", async () => {
    const fila = await prepararPropiedad({ precio: 40000 });
    const respuesta = await patch(fila.id, { precio: 35000 });
    expect(respuesta.status).toBe(200);
    const guardada = await leer(fila.id);
    expect(guardada?.precio).toBe(35000);
    expect(guardada?.estadoPublicacion).toBe("publicada");
  });

  it("precio null borra el precio guardado", async () => {
    const fila = await prepararPropiedad({ precio: 40000 });
    await patch(fila.id, { precio: null });
    expect((await leer(fila.id))?.precio).toBeNull();
  });

  it("al cambiar de nave a oficina limpia altura libre, andenes y kVA", async () => {
    const fila = await prepararPropiedad({ alturaLibreM: 10, andenes: 3, potenciaKva: 500 });
    await patch(fila.id, { tipo: "oficina" });
    const guardada = await leer(fila.id);
    expect(guardada?.alturaLibreM).toBeNull();
    expect(guardada?.andenes).toBeNull();
    expect(guardada?.potenciaKva).toBeNull();
  });
});

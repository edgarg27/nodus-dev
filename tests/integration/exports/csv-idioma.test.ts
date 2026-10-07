import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/server/auth/session.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../../src/server/auth/session.ts")>();
  return { ...real, getUsuarioActual: vi.fn() };
});

const { getUsuarioActual } = await import("../../../src/server/auth/session.ts");
const { db } = await import("../../../src/lib/db/client.ts");
const { propiedad, usuario } = await import("../../../src/lib/db/schema.ts");
const { resetTestDatabase } = await import("../../helpers/reset-db.ts");
const { GET: GET_PROPIEDADES } = await import("../../../src/app/api/v1/properties/export/route.ts");
const { GET: GET_LEADS } = await import("../../../src/app/api/v1/leads/export/route.ts");

async function prepararOferente() {
  await resetTestDatabase();
  const actor = {
    id: randomUUID(),
    email: `nodus-test+${randomUUID()}@example.com`,
    nombre: "Oferente CSV",
    rol: "oferente" as const,
    isBroker: false,
    brokerCode: null,
    referralBrokerId: null,
  };
  await db
    .insert(usuario)
    .values({ id: actor.id, email: actor.email, nombre: actor.nombre, rol: "oferente" });
  await db.insert(propiedad).values({
    oferenteId: actor.id,
    tipo: "oficina",
    modalidad: "renta",
    direccion: "Av. CSV 1",
    direccionNormalizada: `av csv 1 ${actor.id}`,
    estado: "SLP",
    ciudad: "San Luis Potosí",
    lat: "22.15",
    lng: "-100.97",
    descripcion: "Oficina de prueba",
    estadoPublicacion: "pendiente",
  });
  vi.mocked(getUsuarioActual).mockResolvedValue(actor);
}

function peticion(ruta: string, idioma?: string) {
  return new Request(`http://localhost:3000${ruta}`, {
    headers: idioma ? { cookie: `otra=1; idioma=${idioma}` } : {},
  });
}

describe("Exportaciones CSV según el idioma", () => {
  it("propiedades: encabezados, etiquetas y nombre de archivo en inglés con la cookie idioma=en", async () => {
    await prepararOferente();

    const en = await GET_PROPIEDADES(peticion("/api/v1/properties/export", "en"));
    const textoEn = await en.text();
    expect(en.headers.get("content-disposition")).toContain("properties.csv");
    expect(textoEn).toContain("Reference,Title,Type,Listing type");
    expect(textoEn).toContain("Office,For rent");
    expect(textoEn).toContain("Under review");

    const es = await GET_PROPIEDADES(peticion("/api/v1/properties/export"));
    const textoEs = await es.text();
    expect(es.headers.get("content-disposition")).toContain("propiedades.csv");
    expect(textoEs).toContain("Referencia,Título,Tipo,Operación");
    expect(textoEs).toContain("En revisión");
  });

  it("leads: encabezados en inglés con la cookie idioma=en", async () => {
    await prepararOferente();
    const respuesta = await GET_LEADS(peticion("/api/v1/leads/export", "en"));
    const texto = await respuesta.text();
    expect(respuesta.headers.get("content-disposition")).toContain("leads.csv");
    expect(texto).toContain("Name,Email,Phone,Status,Requests");
  });
});

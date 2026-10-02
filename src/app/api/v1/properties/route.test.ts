import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../server/auth/session.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../../../server/auth/session.ts")>();
  return { ...real, getUsuarioActual: vi.fn() };
});

const { getUsuarioActual } = await import("../../../../server/auth/session.ts");
const { db } = await import("../../../../lib/db/client.ts");
const { propiedad, usuario } = await import("../../../../lib/db/schema.ts");
const { resetTestDatabase } = await import("../../../../../tests/helpers/reset-db.ts");
const { GET, POST } = await import("./route.ts");

type ActorFixture = Awaited<ReturnType<typeof getUsuarioActual>>;

function actorFixture(
  rol: "buscador" | "oferente" | "admin" = "oferente",
): NonNullable<ActorFixture> {
  return {
    id: randomUUID(),
    email: `nodus-test+${randomUUID()}@example.com`,
    nombre: "Actor de prueba",
    rol,
    isBroker: false,
    brokerCode: null,
    referralBrokerId: null,
  };
}

function actuarComo(actor: ActorFixture) {
  vi.mocked(getUsuarioActual).mockResolvedValue(actor);
}

async function insertarUsuario(actor: NonNullable<ActorFixture>) {
  await db
    .insert(usuario)
    .values({ id: actor.id, email: actor.email, nombre: actor.nombre, rol: actor.rol });
}

function propiedadFixture(oferenteId: string, overrides: Record<string, unknown> = {}) {
  return {
    oferenteId,
    tipo: "nave_industrial" as const,
    modalidad: "renta" as const,
    direccion: `Av. Financiamiento API ${randomUUID()}`,
    direccionNormalizada: `av financiamiento api ${randomUUID()}`,
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

function requestPost(body: unknown) {
  return new Request("http://localhost/api/v1/properties", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function requestSearch(query: string) {
  return new Request(`http://localhost/api/v1/properties?${query}`);
}

const INPUT_VALIDO = {
  tipo: "nave_industrial",
  modalidad: "renta",
  direccion: "Av. Financiamiento POST",
  lat: 22.15637,
  lng: -100.97889,
  estado: "SLP",
  ciudad: "San Luis Potosí",
  descripcion: "Nave de prueba",
};

describe("POST /api/v1/properties / aceptaFinanciamiento", () => {
  it("con aceptaFinanciamiento: true responde 201 con la fila creada reflejando el valor", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);
    actuarComo(oferente);

    const respuesta = await POST(requestPost({ ...INPUT_VALIDO, aceptaFinanciamiento: true }));
    expect(respuesta.status).toBe(201);
    const { data } = await respuesta.json();
    expect(data.aceptaFinanciamiento).toBe(true);
  });
});

describe("GET /api/v1/properties?financiamiento=", () => {
  it("financiamiento=true devuelve solo propiedades con acepta_financiamiento = true", async () => {
    await resetTestDatabase();
    const oferente = actorFixture();
    await insertarUsuario(oferente);

    const [conFinanciamiento] = await db
      .insert(propiedad)
      .values(propiedadFixture(oferente.id, { aceptaFinanciamiento: true }))
      .returning();
    await db
      .insert(propiedad)
      .values(propiedadFixture(oferente.id, { aceptaFinanciamiento: false }));
    if (!conFinanciamiento) throw new Error("fixture no se creó");

    const respuesta = await GET(requestSearch("financiamiento=true"));
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.data).toHaveLength(1);
    expect(cuerpo.data[0].id).toBe(conFinanciamiento.id);
  });

  it("financiamiento=no responde 422 validation_error", async () => {
    await resetTestDatabase();
    const respuesta = await GET(requestSearch("financiamiento=no"));
    expect(respuesta.status).toBe(422);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("validation_error");
  });

  it("sin el parámetro devuelve resultados sin filtrar por financiamiento", async () => {
    await resetTestDatabase();
    const oferente = actorFixture();
    await insertarUsuario(oferente);

    await db
      .insert(propiedad)
      .values(propiedadFixture(oferente.id, { aceptaFinanciamiento: true }));
    await db
      .insert(propiedad)
      .values(propiedadFixture(oferente.id, { aceptaFinanciamiento: false }));

    const respuesta = await GET(requestSearch(""));
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.data).toHaveLength(2);
  });
});

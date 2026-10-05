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

describe("POST /api/v1/properties / datos del espacio", () => {
  it("guarda precio, moneda, superficies y datos industriales de una nave", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);
    actuarComo(oferente);

    const respuesta = await POST(
      requestPost({
        ...INPUT_VALIDO,
        precio: 4.5,
        moneda: "USD",
        precioUnidad: "m2",
        mantenimiento: 3500,
        superficieConstruidaM2: 1856,
        superficieTerrenoM2: 2400,
        banos: 3,
        estacionamientos: 136,
        alturaLibreM: 10.5,
        andenes: 4,
        potenciaKva: 500,
      }),
    );
    expect(respuesta.status).toBe(201);
    const { data } = await respuesta.json();
    expect(data).toMatchObject({
      precio: 4.5,
      moneda: "USD",
      precioUnidad: "m2",
      mantenimiento: 3500,
      superficieConstruidaM2: 1856,
      superficieTerrenoM2: 2400,
      banos: 3,
      estacionamientos: 136,
      alturaLibreM: 10.5,
      andenes: 4,
      potenciaKva: 500,
    });
  });

  it("sin datos del espacio crea la fila con precio nulo y MXN por defecto", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);
    actuarComo(oferente);

    const respuesta = await POST(requestPost(INPUT_VALIDO));
    expect(respuesta.status).toBe(201);
    const { data } = await respuesta.json();
    expect(data.precio).toBeNull();
    expect(data.moneda).toBe("MXN");
    expect(data.precioUnidad).toBe("total");
  });

  it("descarta los datos industriales si el espacio no es una nave", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);
    actuarComo(oferente);

    const respuesta = await POST(
      requestPost({ ...INPUT_VALIDO, tipo: "oficina", andenes: 2, alturaLibreM: 9 }),
    );
    expect(respuesta.status).toBe(201);
    const { data } = await respuesta.json();
    expect(data.andenes).toBeNull();
    expect(data.alturaLibreM).toBeNull();
  });

  it("responde 422 con un precio negativo o una moneda no soportada", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);
    actuarComo(oferente);

    const negativo = await POST(requestPost({ ...INPUT_VALIDO, precio: -1 }));
    expect(negativo.status).toBe(422);
    const moneda = await POST(requestPost({ ...INPUT_VALIDO, moneda: "EUR" }));
    expect(moneda.status).toBe(422);
  });
});

describe("GET /api/v1/properties / foto y datos del espacio", () => {
  it("cada fila incluye fotoUrl y el precio guardado", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);
    await db.insert(propiedad).values(propiedadFixture(oferente.id, { precio: 38000 }));

    const respuesta = await GET(requestSearch("estado=SLP"));
    expect(respuesta.status).toBe(200);
    const { data } = await respuesta.json();
    expect(data).toHaveLength(1);
    expect(data[0].fotoUrl).toBeNull();
    expect(data[0].precio).toBe(38000);
  });
});

describe("GET /api/v1/properties / filtros de precio y orden", () => {
  it("aplica precio_min y orden=precio_asc", async () => {
    await resetTestDatabase();
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);
    await db
      .insert(propiedad)
      .values([
        propiedadFixture(oferente.id, { precio: 80000 }),
        propiedadFixture(oferente.id, { precio: 20000 }),
        propiedadFixture(oferente.id, { precio: 50000 }),
      ]);

    const respuesta = await GET(requestSearch("precio_min=30000&orden=precio_asc"));
    expect(respuesta.status).toBe(200);
    const { data } = await respuesta.json();
    expect(data.map((fila: { precio: number }) => fila.precio)).toEqual([50000, 80000]);
  });

  it("responde 422 con un precio_min no numérico o un orden desconocido", async () => {
    expect((await GET(requestSearch("precio_min=barato"))).status).toBe(422);
    expect((await GET(requestSearch("orden=azar"))).status).toBe(422);
  });
});

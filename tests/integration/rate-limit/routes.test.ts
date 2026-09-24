import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/server/auth/session.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../../src/server/auth/session.ts")>();
  return { ...real, getUsuarioActual: vi.fn() };
});

const { getUsuarioActual } = await import("../../../src/server/auth/session.ts");
const { db } = await import("../../../src/lib/db/client.ts");
const { propiedad, usuario } = await import("../../../src/lib/db/schema.ts");
const { resetTestDatabase } = await import("../../helpers/reset-db.ts");
const { POST: postContactRequest } = await import(
  "../../../src/app/api/v1/contact-requests/route.ts"
);
const { GET: getGeocode } = await import("../../../src/app/api/v1/geocode/route.ts");

type ActorFixture = Awaited<ReturnType<typeof getUsuarioActual>>;

function actorFixture(
  rol: "buscador" | "oferente" | "admin",
  overrides: Record<string, unknown> = {},
): NonNullable<ActorFixture> {
  return {
    id: randomUUID(),
    email: `nodus-test+${randomUUID()}@example.com`,
    nombre: "Actor de prueba",
    rol,
    isBroker: false,
    brokerCode: null,
    referralBrokerId: null,
    ...overrides,
  };
}

function actuarComo(actor: ActorFixture) {
  vi.mocked(getUsuarioActual).mockResolvedValue(actor);
}

async function insertarUsuario(actor: NonNullable<ActorFixture>) {
  await db.insert(usuario).values({
    id: actor.id,
    email: actor.email,
    nombre: actor.nombre,
    rol: actor.rol,
    isBroker: actor.isBroker,
    brokerCode: actor.brokerCode,
    referralBrokerId: actor.referralBrokerId,
  });
}

function propiedadFixture(oferenteId: string, overrides: Record<string, unknown> = {}) {
  return {
    oferenteId,
    tipo: "nave_industrial" as const,
    modalidad: "renta" as const,
    direccion: `Av. Rate Limit ${randomUUID()}`,
    direccionNormalizada: `av rate limit ${randomUUID()}`,
    lat: "22.150000",
    lng: "-100.970000",
    estado: "SLP" as const,
    ciudad: "San Luis Potosí",
    descripcion: "Propiedad de límite de tasa",
    activo: true,
    estadoPublicacion: "publicada" as const,
    ...overrides,
  };
}

function contactRequestFrom(propiedadId: string, ip: string) {
  return new Request("http://localhost/api/v1/contact-requests", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ propiedad_id: propiedadId, quiere_financiamiento: false }),
  });
}

function geocodeFrom(q: string, ip: string) {
  const url = new URL("http://localhost/api/v1/geocode");
  url.searchParams.set("q", q);
  return new Request(url, { headers: { "x-forwarded-for": ip } });
}

function respuestaMapTiler() {
  return new Response(
    JSON.stringify({
      type: "FeatureCollection",
      features: [{ center: [-100.9789, 22.1564], place_name: "Av. Industrias 100" }],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

const fetchMock = vi.fn();

beforeEach(async () => {
  await resetTestDatabase();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime("2026-01-01T12:00:10Z");
  vi.stubGlobal("fetch", fetchMock);
  process.env.MAPTILER_API_KEY = "llave-secreta-de-prueba";
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("POST /api/v1/contact-requests: límite de 10 por minuto por IP", () => {
  it("permite 10, bloquea la 11 con Retry-After, otra IP sigue y tras 61s la misma IP vuelve", async () => {
    const oferente = actorFixture("oferente");
    await insertarUsuario(oferente);
    const [propia] = await db.insert(propiedad).values(propiedadFixture(oferente.id)).returning();
    if (!propia) throw new Error("fixture no se creó");

    const buscador = actorFixture("buscador");
    await insertarUsuario(buscador);
    actuarComo(buscador);

    const ip = randomUUID();
    for (let i = 0; i < 10; i++) {
      const respuesta = await postContactRequest(contactRequestFrom(propia.id, ip));
      expect(respuesta.status).toBe(201);
    }

    const bloqueada = await postContactRequest(contactRequestFrom(propia.id, ip));
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.headers.get("Retry-After")).not.toBeNull();
    const cuerpoBloqueada = await bloqueada.json();
    expect(cuerpoBloqueada.error.code).toBe("rate_limited");

    const otraIp = await postContactRequest(contactRequestFrom(propia.id, "203.0.113.9"));
    expect(otraIp.status).toBe(201);

    vi.setSystemTime("2026-01-01T12:01:11Z");
    const trasEspera = await postContactRequest(contactRequestFrom(propia.id, ip));
    expect(trasEspera.status).toBe(201);
  });
});

describe("GET /api/v1/geocode: límite de 30 por minuto por IP", () => {
  it("permite 30 y bloquea la 31 con Retry-After", async () => {
    const actor = actorFixture("buscador");
    actuarComo(actor);
    fetchMock.mockImplementation(async () => respuestaMapTiler());

    const ip = randomUUID();
    for (let i = 0; i < 30; i++) {
      const respuesta = await getGeocode(geocodeFrom("Av. Industrias 100", ip));
      expect(respuesta.status).toBe(200);
    }

    const bloqueada = await getGeocode(geocodeFrom("Av. Industrias 100", ip));
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.headers.get("Retry-After")).not.toBeNull();
  });
});

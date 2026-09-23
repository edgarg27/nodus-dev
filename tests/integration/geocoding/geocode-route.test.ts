import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/server/auth/session.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../../src/server/auth/session.ts")>();
  return { ...real, getUsuarioActual: vi.fn() };
});

const { getUsuarioActual } = await import("../../../src/server/auth/session.ts");
const { GET } = await import("../../../src/app/api/v1/geocode/route.ts");

type ActorFixture = Awaited<ReturnType<typeof getUsuarioActual>>;

function actorFixture(): NonNullable<ActorFixture> {
  return {
    id: randomUUID(),
    email: `nodus-test+${randomUUID()}@example.com`,
    nombre: "Actor de prueba",
    rol: "buscador",
    isBroker: false,
    brokerCode: null,
    referralBrokerId: null,
  };
}

function actuarComo(actor: ActorFixture) {
  vi.mocked(getUsuarioActual).mockResolvedValue(actor);
}

function request(q: string | null) {
  const url = new URL("http://localhost/api/v1/geocode");
  if (q !== null) url.searchParams.set("q", q);
  return new Request(url);
}

function respuestaMapTiler(features: unknown[]) {
  return new Response(JSON.stringify({ type: "FeatureCollection", features }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  process.env.MAPTILER_API_KEY = "llave-secreta-de-prueba";
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("GET /api/v1/geocode", () => {
  it("sin sesión responde 401", async () => {
    actuarComo(null);
    const respuesta = await GET(request("Av. Industrias"));
    expect(respuesta.status).toBe(401);
  });

  it("q ausente, en blanco o menor a 3 caracteres responde 422", async () => {
    actuarComo(actorFixture());

    expect((await GET(request(null))).status).toBe(422);
    expect((await GET(request("  "))).status).toBe(422);
    expect((await GET(request("ab"))).status).toBe(422);
  });

  it("con resultado de MapTiler responde 200 con lat, lng y direccion_sugerida", async () => {
    actuarComo(actorFixture());
    fetchMock.mockResolvedValueOnce(
      respuestaMapTiler([
        { center: [-100.9789, 22.1564], place_name: "Av. Industrias 100, San Luis Potosí" },
      ]),
    );

    const respuesta = await GET(request("Av. Industrias 100"));
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.data).toEqual({
      lat: 22.1564,
      lng: -100.9789,
      direccion_sugerida: "Av. Industrias 100, San Luis Potosí",
    });
  });

  it("sin resultados de MapTiler responde 404", async () => {
    actuarComo(actorFixture());
    fetchMock.mockResolvedValueOnce(respuestaMapTiler([]));

    const respuesta = await GET(request("direccion inexistente xyz"));
    expect(respuesta.status).toBe(404);
  });

  it("la respuesta nunca incluye MAPTILER_API_KEY", async () => {
    actuarComo(actorFixture());
    fetchMock.mockResolvedValueOnce(
      respuestaMapTiler([{ center: [-100.9789, 22.1564], place_name: "Dirección" }]),
    );

    const respuesta = await GET(request("Av. Industrias 100"));
    const texto = await respuesta.text();
    expect(texto).not.toContain("llave-secreta-de-prueba");
  });
});

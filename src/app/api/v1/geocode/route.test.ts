import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../server/auth/session.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../../../server/auth/session.ts")>();
  return { ...real, getUsuarioActual: vi.fn() };
});

const { getUsuarioActual } = await import("../../../../server/auth/session.ts");
const { GET } = await import("./route.ts");

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

function request(q: string | null, suggest?: string) {
  const url = new URL("http://localhost/api/v1/geocode");
  if (q !== null) url.searchParams.set("q", q);
  if (suggest !== undefined) url.searchParams.set("suggest", suggest);
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

describe("GET /api/v1/geocode?suggest=true", () => {
  it("responde { data: { sugerencias: [...] } }", async () => {
    actuarComo(actorFixture());
    fetchMock.mockResolvedValueOnce(
      respuestaMapTiler([
        {
          center: [-100.9789, 22.1564],
          place_name: "Av. Industrias 100, San Luis Potosí",
          context: [
            { id: "place.1", text: "San Luis Potosí" },
            { id: "region.1", text: "San Luis Potosí" },
            { id: "postal_code.1", text: "78000" },
          ],
        },
      ]),
    );

    const respuesta = await GET(request("Av. Industrias 100", "true"));
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.data.sugerencias).toEqual([
      {
        lat: 22.1564,
        lng: -100.9789,
        direccion_sugerida: "Av. Industrias 100, San Luis Potosí",
        ciudad: "San Luis Potosí",
        estado: "San Luis Potosí",
        codigo_postal: "78000",
      },
    ]);
  });
});

describe("GET /api/v1/geocode sin suggest", () => {
  it("responde exactamente como hoy", async () => {
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
});

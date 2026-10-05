import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route.ts";

const fetchMock = vi.fn();

function request(q: string | null) {
  const url = new URL("http://localhost/api/v1/geocode/ciudades");
  if (q !== null) url.searchParams.set("q", q);
  return new Request(url);
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  process.env.MAPTILER_API_KEY = "llave-secreta-de-prueba";
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("GET /api/v1/geocode/ciudades", () => {
  it("es público: responde sin sesión con las ciudades sugeridas", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          features: [
            {
              center: [-100, 22],
              place_name: "San Luis Potosí, México",
              context: [{ id: "region.3", text: "San Luis Potosí" }],
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const respuesta = await GET(request("san lu"));
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.data.ciudades).toEqual([
      { ciudad: "San Luis Potosí", estado: "San Luis Potosí" },
    ]);
    expect(JSON.stringify(cuerpo)).not.toContain("llave-secreta-de-prueba");
  });

  it("q ausente o de menos de 2 caracteres responde 422", async () => {
    expect((await GET(request(null))).status).toBe(422);
    expect((await GET(request("a"))).status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("si MapTiler falla responde 502 en vez de un 500", async () => {
    fetchMock.mockResolvedValueOnce(new Response("error", { status: 500 }));
    const respuesta = await GET(request("leon"));
    expect(respuesta.status).toBe(502);
  });
});

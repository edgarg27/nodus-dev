import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buscarCiudades, geocodificar } from "./client.ts";

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

describe("geocodificar sin opciones", () => {
  it("devuelve el mejor resultado (con estado y ciudad, null si MapTiler no los da) o null", async () => {
    fetchMock.mockResolvedValueOnce(
      respuestaMapTiler([
        { center: [-100.9789, 22.1564], place_name: "Av. Industrias 100, San Luis Potosí" },
      ]),
    );

    const resultado = await geocodificar("Av. Industrias 100");
    expect(resultado).toEqual({
      lat: 22.1564,
      lng: -100.9789,
      direccionSugerida: "Av. Industrias 100, San Luis Potosí",
      estado: null,
      ciudad: null,
    });

    fetchMock.mockResolvedValueOnce(respuestaMapTiler([]));
    const sinResultado = await geocodificar("direccion inexistente xyz");
    expect(sinResultado).toBeNull();
  });
});

describe("geocodificar(q, { limit })", () => {
  it("devuelve un arreglo de hasta `limit` sugerencias con ciudad/estado/codigoPostal del context", async () => {
    fetchMock.mockResolvedValueOnce(
      respuestaMapTiler([
        {
          center: [-100.9789, 22.1564],
          place_name: "Av. Industrias 100, San Luis Potosí, SLP, México",
          context: [
            { id: "place.123", text: "San Luis Potosí" },
            { id: "region.456", text: "San Luis Potosí" },
            { id: "postal_code.789", text: "78000" },
            { id: "country.1", text: "México" },
          ],
        },
        { center: [-100.9, 22.1], place_name: "Av. Industrias 200" },
      ]),
    );

    const sugerencias = await geocodificar("Av. Industrias", { limit: 5 });
    expect(sugerencias).toHaveLength(2);
    expect(sugerencias[0]).toEqual({
      lat: 22.1564,
      lng: -100.9789,
      direccionSugerida: "Av. Industrias 100, San Luis Potosí, SLP, México",
      ciudad: "San Luis Potosí",
      estado: "San Luis Potosí",
      codigoPostal: "78000",
    });
    expect(sugerencias[1]).toEqual({
      lat: 22.1,
      lng: -100.9,
      direccionSugerida: "Av. Industrias 200",
      ciudad: undefined,
      estado: undefined,
      codigoPostal: undefined,
    });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("autocomplete=true");
    expect(url).toContain("limit=5");
  });

  it("recorta a lo más `limit` resultados aunque MapTiler devuelva más", async () => {
    fetchMock.mockResolvedValueOnce(
      respuestaMapTiler([
        { center: [-100.9, 22.1], place_name: "A" },
        { center: [-100.8, 22.2], place_name: "B" },
        { center: [-100.7, 22.3], place_name: "C" },
      ]),
    );

    const sugerencias = await geocodificar("Av.", { limit: 2 });
    expect(sugerencias).toHaveLength(2);
  });
});

describe("buscarCiudades", () => {
  it("acepta todo México, deduplica y usa el estado del context", async () => {
    fetchMock.mockResolvedValueOnce(
      respuestaMapTiler([
        {
          center: [-101, 21],
          place_name: "León, México",
          context: [{ id: "region.1", text: "Guanajuato" }],
        },
        {
          center: [-101, 21],
          place_name: "León, México",
          context: [
            { id: "place.2", text: "León" },
            { id: "region.1", text: "Guanajuato" },
          ],
        },
        {
          center: [-114, 32],
          place_name: "San Luis Río Colorado, México",
          context: [{ id: "region.9", text: "Sonora" }],
        },
        {
          center: [-100, 22],
          place_name: "San Luis Potosí, México",
          context: [{ id: "region.3", text: "San Luis Potosí" }],
        },
      ]),
    );

    const ciudades = await buscarCiudades("le");
    expect(ciudades).toEqual([
      { ciudad: "León", estado: "Guanajuato" },
      { ciudad: "San Luis Río Colorado", estado: "Sonora" },
      { ciudad: "San Luis Potosí", estado: "San Luis Potosí" },
    ]);
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("country=mx");
    expect(url).toContain("types=municipality");
  });
});

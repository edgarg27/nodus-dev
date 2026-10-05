// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { extraerDetalles } from "@/lib/property-details";

vi.mock("../map/property-map", () => ({
  PropertyMap: () => null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const { SearchResults } = await import("./search-results");

function propiedad(id: string) {
  return {
    id,
    direccion: `Av. Prueba ${id}`,
    tipo: "nave_industrial",
    modalidad: "renta",
    estado: "SLP",
    ciudad: "San Luis Potosí",
    descripcion: "Descripción",
    lat: 22.15,
    lng: -100.97,
    fotoUrl: null,
    ...extraerDetalles({}),
  };
}

function respuestaPagina() {
  return new Response(
    JSON.stringify({
      data: [],
      meta: { has_more: false, next_cursor: null },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

const fetchMock = vi.fn();

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("SearchResults / cargar más conserva los filtros", () => {
  it("incluye financiamiento en la URL de paginación cuando el filtro está activo", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(respuestaPagina());

    render(
      <SearchResults
        propiedadesIniciales={[propiedad("1")]}
        hasMoreInicial={true}
        nextCursorInicial="1"
        filtros={{ estado: "SLP", financiamiento: "true" }}
        orden="relevancia"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Cargar más espacios" }));

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("financiamiento=true");
    expect(url).toContain("estado=SLP");
  });

  it("omite financiamiento de la URL de paginación cuando el filtro no está activo", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(respuestaPagina());

    render(
      <SearchResults
        propiedadesIniciales={[propiedad("1")]}
        hasMoreInicial={true}
        nextCursorInicial="1"
        filtros={{}}
        orden="relevancia"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Cargar más espacios" }));

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).not.toContain("financiamiento");
  });
});

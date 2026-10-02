// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddressAutocomplete } from "./address-autocomplete";

const fetchMock = vi.fn();

function filaApi(n: number) {
  return {
    lat: 22 + n / 100,
    lng: -100 - n / 100,
    direccion_sugerida: `Av. Industrias ${n}, San Luis Potosí`,
    ciudad: "San Luis Potosí",
    estado: "San Luis Potosí",
    codigo_postal: "78000",
  };
}

function respuestaSugerencias(cantidad: number) {
  return new Response(
    JSON.stringify({
      data: { sugerencias: Array.from({ length: cantidad }, (_, i) => filaApi(i + 1)) },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function renderizar(onSeleccionar = vi.fn()) {
  vi.stubGlobal("fetch", fetchMock);
  render(<AddressAutocomplete aria-label="Dirección" onSeleccionar={onSeleccionar} />);
  return { onSeleccionar, input: screen.getByRole("combobox", { name: "Dirección" }) };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("AddressAutocomplete", () => {
  it("con 3+ caracteres y tras el debounce muestra hasta 5 sugerencias", async () => {
    fetchMock.mockResolvedValue(respuestaSugerencias(7));
    const { input } = renderizar();

    await userEvent.type(input, "Av.");
    expect(fetchMock).not.toHaveBeenCalled();

    const opciones = await screen.findAllByRole("option");
    expect(opciones).toHaveLength(5);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/geocode?q=Av.&suggest=true");
  });

  it("con menos de 3 caracteres no pide sugerencias", async () => {
    const { input } = renderizar();

    await userEvent.type(input, "Av");
    await new Promise((resolver) => setTimeout(resolver, 450));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("al seleccionar una sugerencia con clic llama onSeleccionar con todos los datos", async () => {
    fetchMock.mockResolvedValue(respuestaSugerencias(2));
    const { input, onSeleccionar } = renderizar();

    await userEvent.type(input, "Av. Ind");
    await userEvent.click((await screen.findAllByRole("option"))[1] as HTMLElement);

    expect(onSeleccionar).toHaveBeenCalledWith({
      direccion: "Av. Industrias 2, San Luis Potosí",
      lat: 22.02,
      lng: -100.02,
      ciudad: "San Luis Potosí",
      estado: "San Luis Potosí",
      codigoPostal: "78000",
    });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("flechas + Enter seleccionan la opción resaltada", async () => {
    fetchMock.mockResolvedValue(respuestaSugerencias(3));
    const { input, onSeleccionar } = renderizar();

    await userEvent.type(input, "Av. Ind");
    await screen.findAllByRole("option");
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    expect(screen.getAllByRole("option")[1]?.getAttribute("aria-selected")).toBe("true");
    await userEvent.keyboard("{Enter}");

    expect(onSeleccionar).toHaveBeenCalledTimes(1);
    expect(onSeleccionar.mock.calls[0]?.[0].direccion).toBe("Av. Industrias 2, San Luis Potosí");
  });

  it("Escape cierra el listbox sin seleccionar ni modificar el texto", async () => {
    fetchMock.mockResolvedValue(respuestaSugerencias(3));
    const { input, onSeleccionar } = renderizar();

    await userEvent.type(input, "Av. Ind");
    await screen.findAllByRole("option");
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onSeleccionar).not.toHaveBeenCalled();
    expect((input as HTMLInputElement).value).toBe("Av. Ind");
  });

  it("si la petición falla no muestra sugerencias y el campo sigue editable", async () => {
    fetchMock.mockRejectedValue(new Error("red caída"));
    const { input } = renderizar();

    await userEvent.type(input, "Av. Industrias");
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(screen.queryByRole("listbox")).toBeNull();
    await userEvent.type(input, " 100");
    expect((input as HTMLInputElement).value).toBe("Av. Industrias 100");
  });
});

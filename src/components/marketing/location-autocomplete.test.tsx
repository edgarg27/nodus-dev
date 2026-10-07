// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocationAutocomplete } from "./location-autocomplete";

const fetchMock = vi.fn();

function renderizar() {
  vi.stubGlobal("fetch", fetchMock);
  render(
    <form>
      <LocationAutocomplete ariaLabel="Ubicación" placeholder="Ubicación" />
    </form>,
  );
  return screen.getByRole("combobox", { name: "Ubicación" }) as HTMLInputElement;
}

function respuestaCiudades(ciudades: Array<{ ciudad: string; estado: string }>) {
  return new Response(JSON.stringify({ data: { ciudades } }), { status: 200 });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("LocationAutocomplete", () => {
  it("al enfocar sin texto muestra las ciudades principales sin pedir nada a la red", async () => {
    const input = renderizar();
    await userEvent.click(input);

    const opciones = await screen.findAllByRole("option");
    expect(opciones.map((o) => o.textContent)).toEqual([
      "San Luis Potosí",
      "Aguascalientes",
      "León, Guanajuato",
      "Ciudad de México",
      "Monterrey, Nuevo León",
      "Guadalajara, Jalisco",
      "Querétaro",
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("al escribir muestra las sugerencias de MapTiler", async () => {
    fetchMock.mockResolvedValue(
      respuestaCiudades([{ ciudad: "San Luis de la Paz", estado: "Guanajuato" }]),
    );
    const input = renderizar();
    await userEvent.type(input, "san lu");

    const opcion = await screen.findByRole("option", { name: "San Luis de la Paz, Guanajuato" });
    expect(opcion).toBeTruthy();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/geocode/ciudades?q=san%20lu");
  });

  it("elegir una opción deja solo el nombre de la ciudad en el campo y cierra la lista", async () => {
    const input = renderizar();
    await userEvent.click(input);
    await userEvent.click(await screen.findByRole("option", { name: "León, Guanajuato" }));

    expect(input.value).toBe("León");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("flechas + Enter seleccionan sin enviar el formulario; Escape cierra", async () => {
    const input = renderizar();
    await userEvent.click(input);
    await screen.findAllByRole("option");
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(input.value).toBe("Aguascalientes");

    await userEvent.clear(input);
    await userEvent.click(input);
    await screen.findAllByRole("option");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("si la petición falla usa las ciudades principales que coinciden", async () => {
    fetchMock.mockRejectedValue(new Error("red caída"));
    const input = renderizar();
    await userEvent.type(input, "agu");

    const opciones = await screen.findAllByRole("option");
    expect(opciones.map((o) => o.textContent)).toEqual(["Aguascalientes"]);
  });
});

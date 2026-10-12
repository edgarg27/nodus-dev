// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ESTADOS_MX } from "@/lib/estados";
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

// Lo que el formulario mandaría a /buscar.
function camposEnviados(input: HTMLInputElement) {
  return Object.fromEntries(new FormData(input.form as HTMLFormElement));
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
  it("al enfocar sin texto muestra los 32 estados sin pedir nada a la red", async () => {
    const input = renderizar();
    await userEvent.click(input);

    const opciones = await screen.findAllByRole("option");
    expect(opciones.map((o) => o.textContent)).toEqual(ESTADOS_MX.map((estado) => estado.nombre));
    expect(opciones).toHaveLength(32);
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

  it("elegir un estado envía su código como `estado` y nada en `ciudad`", async () => {
    const input = renderizar();
    await userEvent.click(input);
    await userEvent.click(await screen.findByRole("option", { name: "San Luis Potosí" }));

    expect(input.value).toBe("San Luis Potosí");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(camposEnviados(input)).toEqual({ estado: "SLP" });
  });

  it("al escribir encuentra el estado aunque falten los acentos", async () => {
    fetchMock.mockResolvedValue(respuestaCiudades([]));
    const input = renderizar();
    await userEvent.type(input, "queret");

    expect(await screen.findByRole("option", { name: "Querétaro" })).toBeTruthy();
  });

  it("elegir una ciudad deja solo su nombre y lo envía como `ciudad`", async () => {
    fetchMock.mockResolvedValue(respuestaCiudades([{ ciudad: "León", estado: "Guanajuato" }]));
    const input = renderizar();
    await userEvent.type(input, "leon");
    await userEvent.click(await screen.findByRole("option", { name: "León, Guanajuato" }));

    expect(input.value).toBe("León");
    expect(camposEnviados(input)).toEqual({ ciudad: "León" });
  });

  it("corregir el texto después de elegir un estado vuelve a enviarlo como `ciudad`", async () => {
    fetchMock.mockResolvedValue(respuestaCiudades([]));
    const input = renderizar();
    await userEvent.click(input);
    await userEvent.click(await screen.findByRole("option", { name: "Jalisco" }));
    await userEvent.clear(input);
    await userEvent.type(input, "Zapopan");

    expect(camposEnviados(input)).toEqual({ ciudad: "Zapopan" });
  });

  it("flechas + Enter seleccionan sin enviar el formulario; Escape cierra", async () => {
    const input = renderizar();
    await userEvent.click(input);
    await screen.findAllByRole("option");
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(input.value).toBe("Baja California");

    await userEvent.clear(input);
    await userEvent.click(input);
    await screen.findAllByRole("option");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("si la petición falla quedan los estados que coinciden", async () => {
    fetchMock.mockRejectedValue(new Error("red caída"));
    const input = renderizar();
    await userEvent.type(input, "agu");

    const opciones = await screen.findAllByRole("option");
    expect(opciones.map((o) => o.textContent)).toEqual(["Aguascalientes"]);
  });
});

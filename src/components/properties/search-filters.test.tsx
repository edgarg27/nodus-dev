// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { SearchFilters, type SearchFiltersInitial } from "./search-filters";

async function abrirPanel() {
  await userEvent.click(screen.getByRole("button", { name: "Filtros" }));
}

function formulario(): HTMLFormElement {
  const form = document.querySelector("form");
  if (!form) throw new Error("no se encontró el formulario de filtros");
  return form;
}

describe("SearchFilters", () => {
  afterEach(() => {
    cleanup();
  });

  it("el select de estado incluye Cualquiera y los 3 estados, y preselecciona initial.estado", async () => {
    render(<SearchFilters initial={{ estado: "Aguascalientes" }} />);
    await abrirPanel();

    const select = screen.getByLabelText("Estado") as HTMLSelectElement;
    expect(select.name).toBe("estado");
    expect(Array.from(select.options).map((o) => o.value)).toEqual([
      "",
      "SLP",
      "Aguascalientes",
      "Leon",
    ]);
    expect(select.value).toBe("Aguascalientes");
  });

  it("elegir un estado y enviar produce estado=<valor> en el FormData", async () => {
    render(<SearchFilters initial={{}} />);
    await abrirPanel();

    const select = screen.getByLabelText("Estado") as HTMLSelectElement;
    await userEvent.selectOptions(select, "SLP");

    const datos = new FormData(formulario());
    expect(datos.get("estado")).toBe("SLP");
  });

  it("sin tocar financiamiento, ningún radio queda marcado y el FormData omite el parámetro", async () => {
    render(<SearchFilters initial={{}} />);
    await abrirPanel();

    const radioSi = screen.getByRole("radio", { name: "Sí" }) as HTMLInputElement;
    const radioNo = screen.getByRole("radio", { name: "No" }) as HTMLInputElement;
    expect(radioSi.checked).toBe(false);
    expect(radioNo.checked).toBe(false);

    const datos = new FormData(formulario());
    expect(datos.has("financiamiento")).toBe(false);
  });

  it("elegir Sí en financiamiento produce financiamiento=true en el FormData", async () => {
    render(<SearchFilters initial={{}} />);
    await abrirPanel();

    await userEvent.click(screen.getByRole("radio", { name: "Sí" }));

    const datos = new FormData(formulario());
    expect(datos.get("financiamiento")).toBe("true");
  });

  it("initial.financiamiento preselecciona el radio correspondiente al reabrir el panel", async () => {
    const casos: Array<[SearchFiltersInitial["financiamiento"], "Sí" | "No"]> = [
      ["true", "Sí"],
      ["false", "No"],
    ];

    for (const [valor, etiqueta] of casos) {
      render(<SearchFilters initial={{ financiamiento: valor }} />);
      await abrirPanel();

      const marcado = screen.getByRole("radio", { name: etiqueta }) as HTMLInputElement;
      expect(marcado.checked).toBe(true);
      cleanup();
    }
  });
});

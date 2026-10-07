// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PaginationBar } from "./pagination-bar";

afterEach(cleanup);

describe("PaginationBar", () => {
  it("muestra el rango y los enlaces en el idioma elegido", () => {
    render(
      <PaginationBar
        pagina={2}
        porPagina={25}
        total={60}
        hrefDe={(pagina) => `/red?pagina=${pagina}`}
        idioma="en"
      />,
    );
    expect(screen.getByText("26-50 of 60")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Previous page" }).getAttribute("href")).toBe(
      "/red?pagina=1",
    );
    expect(screen.getByRole("link", { name: "Next page" }).getAttribute("href")).toBe(
      "/red?pagina=3",
    );
  });

  it("en español usa «de» y no muestra nada sin resultados", () => {
    const { container } = render(
      <PaginationBar pagina={1} porPagina={25} total={0} hrefDe={() => "/red"} idioma="es" />,
    );
    expect(container.textContent).toBe("");
    cleanup();
    render(<PaginationBar pagina={1} porPagina={25} total={3} hrefDe={() => "/red"} idioma="es" />);
    expect(screen.getByText("1-3 de 3")).toBeTruthy();
  });
});

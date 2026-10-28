// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const navegacion = vi.hoisted(() => ({ pathname: "/", refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => navegacion.pathname,
  useRouter: () => ({ refresh: navegacion.refresh }),
}));

const { SessionSync } = await import("./session-sync");

describe("SessionSync", () => {
  afterEach(() => {
    cleanup();
    navegacion.refresh.mockClear();
  });

  it("con el encabezado de una cuenta abierta en /sign-in, pide el layout de nuevo", () => {
    navegacion.pathname = "/sign-in";
    render(<SessionSync autenticado />);
    expect(navegacion.refresh).toHaveBeenCalledTimes(1);
  });

  it("también en registro y recuperar contraseña", () => {
    for (const ruta of ["/sign-up", "/recuperar"]) {
      navegacion.pathname = ruta;
      render(<SessionSync autenticado />);
      cleanup();
    }
    expect(navegacion.refresh).toHaveBeenCalledTimes(2);
  });

  it("sin sesión en el encabezado, o fuera de las pantallas de acceso, no hace nada", () => {
    navegacion.pathname = "/sign-in";
    render(<SessionSync autenticado={false} />);
    cleanup();
    navegacion.pathname = "/buscar";
    render(<SessionSync autenticado />);
    expect(navegacion.refresh).not.toHaveBeenCalled();
  });
});

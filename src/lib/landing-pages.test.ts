import { describe, expect, it } from "vitest";
import { resolverLanding, rutaLanding, todasLasLandings } from "./landing-pages";

describe("resolverLanding", () => {
  it("arma título, ruta y filtros de una combinación con lugar", () => {
    const landing = resolverLanding("renta", "naves-industriales", "san-luis-potosi");
    expect(landing?.titulo).toBe("Naves industriales en renta en San Luis Potosí");
    expect(landing?.ruta).toBe("/renta/naves-industriales/san-luis-potosi");
    expect(landing?.filtros).toEqual({
      modalidad: "renta",
      tipo: "nave_industrial",
      estado: "SLP",
    });
  });

  it("sin lugar cubre todas las ciudades", () => {
    const landing = resolverLanding("proyecto-desde-cero", "oficinas");
    expect(landing?.titulo).toBe("Oficinas como proyecto desde cero");
    expect(landing?.filtros).toEqual({ modalidad: "desde_cero", tipo: "oficina" });
  });

  it("devuelve null con una operación, tipo o lugar desconocido", () => {
    expect(resolverLanding("alquiler", "oficinas")).toBeNull();
    expect(resolverLanding("renta", "castillos")).toBeNull();
    expect(resolverLanding("renta", "oficinas", "cdmx")).toBeNull();
  });
});

describe("todasLasLandings", () => {
  it("genera 3 operaciones × 3 tipos × (todas + 3 lugares) rutas únicas", () => {
    const rutas = todasLasLandings().map((landing) => landing.ruta);
    expect(rutas).toHaveLength(36);
    expect(new Set(rutas).size).toBe(36);
    expect(rutas).toContain(rutaLanding("venta", "locales-comerciales", "leon"));
  });
});

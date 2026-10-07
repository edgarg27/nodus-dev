import { describe, expect, it } from "vitest";
import { CODIGOS_ESTADO_DB } from "./db/schema";
import { CODIGOS_ESTADO, ESTADOS_MX, estadoDesdeNombre, nombreEstado } from "./estados";
import { leerBusqueda } from "./search-params";

describe("estados de México", () => {
  it("son 32, con códigos y slugs únicos, y coinciden con el check de la base", () => {
    expect(ESTADOS_MX).toHaveLength(32);
    expect(new Set(CODIGOS_ESTADO).size).toBe(32);
    expect(new Set(ESTADOS_MX.map((estado) => estado.slug)).size).toBe(32);
    expect([...CODIGOS_ESTADO].sort()).toEqual([...CODIGOS_ESTADO_DB].sort());
  });

  it("reconoce nombres con acentos, oficiales y abreviaturas", () => {
    expect(estadoDesdeNombre("San Luis Potosí")).toBe("SLP");
    expect(estadoDesdeNombre("CDMX")).toBe("Ciudad de Mexico");
    expect(estadoDesdeNombre("Nuevo León")).toBe("Nuevo Leon");
    expect(estadoDesdeNombre("Veracruz de Ignacio de la Llave")).toBe("Veracruz");
    expect(estadoDesdeNombre("querétaro")).toBe("Queretaro");
    expect(estadoDesdeNombre("Ontario")).toBeNull();
  });

  it("muestra el nombre con acentos", () => {
    expect(nombreEstado("Michoacan")).toBe("Michoacán");
    expect(nombreEstado("SLP")).toBe("San Luis Potosí");
  });

  it("una liga vieja con estado=Leon se lee como Guanajuato", () => {
    const { filtros, invalidos } = leerBusqueda((clave) =>
      clave === "estado" ? "Leon" : undefined,
    );
    expect(filtros.estado).toBe("Guanajuato");
    expect(invalidos).toEqual([]);
  });
});

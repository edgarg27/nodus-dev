import { describe, expect, it } from "vitest";
import {
  busquedaAParams,
  contarFiltrosActivos,
  describirBusqueda,
  leerBusqueda,
} from "./search-params";

function leerDe(query: string) {
  const params = new URLSearchParams(query);
  return leerBusqueda((clave) => params.get(clave) ?? undefined);
}

describe("leerBusqueda", () => {
  it("lee filtros de texto, rangos numéricos y el orden", () => {
    const { filtros, orden, invalidos } = leerDe(
      "tipo=nave_industrial&estado=SLP&m2_min=1,500&andenes=2&orden=superficie_desc",
    );
    expect(invalidos).toEqual([]);
    expect(orden).toBe("superficie_desc");
    expect(filtros).toEqual({
      tipo: "nave_industrial",
      estado: "SLP",
      superficieMin: 1500,
      andenesMin: 2,
    });
  });

  it("con el precio sujeto a cotización ignora el rango y el orden por precio", () => {
    const { filtros, orden, invalidos } = leerDe(
      "tipo=oficina&precio_min=10000&precio_max=50000&orden=precio_asc",
    );
    expect(invalidos).toEqual([]);
    expect(filtros).toEqual({ tipo: "oficina" });
    expect(orden).toBe("relevancia");
  });

  it("ignora los campos vacíos que manda el formulario", () => {
    const { filtros, invalidos } = leerDe("modalidad=&precio_min=&m2_max=&banos=&moneda=MXN");
    expect(invalidos).toEqual([]);
    expect(filtros).toEqual({ moneda: "MXN" });
  });

  it("reporta valores inválidos sin aplicarlos", () => {
    const { filtros, orden, invalidos } = leerDe("tipo=castillo&m2_min=-5&banos=muchos&orden=azar");
    expect(invalidos.sort()).toEqual(["banos", "m2_min", "orden", "tipo"]);
    expect(filtros).toEqual({});
    expect(orden).toBe("relevancia");
  });
});

describe("busquedaAParams", () => {
  it("conserva todos los filtros y el orden (ida y vuelta)", () => {
    const original = "estado=SLP&financiamiento=true&precio_max=40000&moneda=USD&orden=recientes";
    const { filtros, orden } = leerDe(original);
    const vuelta = leerDe(busquedaAParams(filtros, orden).toString());
    expect(vuelta.filtros).toEqual(filtros);
    expect(vuelta.orden).toBe("recientes");
  });

  it("omite el orden por defecto y la moneda sin rango de precio", () => {
    expect(busquedaAParams({ tipo: "oficina", moneda: "MXN" }, "relevancia").toString()).toBe(
      "tipo=oficina",
    );
  });
});

describe("contarFiltrosActivos", () => {
  it("cuenta cada rango una sola vez y no cuenta la moneda", () => {
    expect(
      contarFiltrosActivos({
        estado: "SLP",
        precioMin: 1,
        precioMax: 2,
        moneda: "USD",
        superficieMin: 100,
        andenesMin: 1,
      }),
    ).toBe(4);
  });
});

describe("describirBusqueda", () => {
  it("arma un nombre legible con tipo, operación, lugar y rangos", () => {
    expect(
      describirBusqueda({
        tipo: "nave_industrial",
        modalidad: "renta",
        estado: "SLP",
        precioMin: 50000,
        precioMax: 100000,
        moneda: "MXN",
        superficieMin: 1000,
        andenesMin: 2,
      }),
    ).toBe(
      "Naves industriales en renta en San Luis Potosí · $50,000 a $100,000 MXN · desde 1,000 m² · 2+ andenes",
    );
    expect(describirBusqueda({})).toBe("Espacios");
  });
});

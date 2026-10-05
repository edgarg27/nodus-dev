import { describe, expect, it } from "vitest";
import {
  especificaciones,
  extraerDetalles,
  formatearPrecio,
  resumenDetalles,
  tituloEspacio,
} from "./property-details";

describe("formatearPrecio", () => {
  it("renta en MXN se muestra mensual", () => {
    expect(formatearPrecio({ precio: 38000, moneda: "MXN", precioUnidad: "total" }, "renta")).toBe(
      "$38,000 MXN /mes",
    );
  });

  it("precio por m² en USD con decimales", () => {
    expect(formatearPrecio({ precio: 4.5, moneda: "USD", precioUnidad: "m2" }, "renta")).toBe(
      "USD 4.50 /m² /mes",
    );
  });

  it("venta sin periodo", () => {
    expect(
      formatearPrecio({ precio: 12500000, moneda: "MXN", precioUnidad: "total" }, "venta"),
    ).toBe("$12,500,000 MXN");
  });

  it("sin precio muestra Precio a consultar", () => {
    expect(formatearPrecio({ precio: null, moneda: "MXN", precioUnidad: "total" }, "renta")).toBe(
      "Precio a consultar",
    );
  });
});

describe("resumenDetalles", () => {
  const base = extraerDetalles({
    superficieConstruidaM2: 1856,
    banos: 1,
    estacionamientos: 136,
    alturaLibreM: 10,
    andenes: 4,
    potenciaKva: 500,
  });

  it("incluye los datos industriales solo en naves", () => {
    expect(resumenDetalles(base, "nave_industrial")).toEqual([
      "1,856 m²",
      "1 baño",
      "136 estacionamientos",
      "10 m de altura libre",
      "4 andenes",
      "500 kVA",
    ]);
    expect(resumenDetalles(base, "oficina")).toEqual([
      "1,856 m²",
      "1 baño",
      "136 estacionamientos",
    ]);
  });

  it("sin datos devuelve una lista vacía", () => {
    expect(resumenDetalles(extraerDetalles({}), "oficina")).toEqual([]);
  });
});

describe("especificaciones", () => {
  it("formatea el mantenimiento con la moneda del espacio", () => {
    const filas = especificaciones(
      extraerDetalles({ mantenimiento: 3500, moneda: "MXN" }),
      "oficina",
    );
    expect(filas).toEqual([{ etiqueta: "Mantenimiento", valor: "$3,500 MXN /mes" }]);
  });
});

describe("extraerDetalles", () => {
  it("convierte numéricos que llegan como texto y deja nulos los vacíos", () => {
    expect(extraerDetalles({ precio: "38000.00", banos: "", moneda: "USD" })).toMatchObject({
      precio: 38000,
      banos: null,
      moneda: "USD",
    });
  });
});

describe("tituloEspacio", () => {
  it("arma el título según tipo y operación", () => {
    expect(tituloEspacio("nave_industrial", "renta", "San Luis Potosí")).toBe(
      "Nave industrial en renta en San Luis Potosí",
    );
    expect(tituloEspacio("oficina", "venta", "León")).toBe("Oficina en venta en León");
    expect(tituloEspacio("local_comercial", "desde_cero", "Aguascalientes")).toBe(
      "Local comercial como proyecto desde cero en Aguascalientes",
    );
  });
});

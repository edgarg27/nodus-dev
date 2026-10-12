import { describe, expect, it } from "vitest";
import { normalizeAddress } from "./normalize-address";

describe("normalizeAddress", () => {
  it("ignora mayúsculas, acentos, signos y espacios repetidos", () => {
    expect(normalizeAddress("  Calle  Álvaro Obregón, 45.  ")).toBe("calle alvaro obregon 45");
  });

  it("la misma dirección con abreviaturas distintas da el mismo texto", () => {
    const esperado = "avenida aguascalientes 123 colonia centro";
    for (const direccion of [
      "Av. Aguascalientes #123, Col. Centro",
      "Avenida Aguascalientes No. 123, Colonia Centro",
      "AVDA AGUASCALIENTES NÚM 123 COL CENTRO",
      "Ave Aguascalientes Número 123, col. Centro",
    ]) {
      expect(normalizeAddress(direccion)).toBe(esperado);
    }
  });

  it("boulevard, calzada, carretera y los puntos cardinales", () => {
    expect(normalizeAddress("Blvd. Díaz Ordaz 500 Pte")).toBe("boulevard diaz ordaz 500 poniente");
    expect(normalizeAddress("Bulevar Díaz Ordaz 500 Poniente")).toBe(
      "boulevard diaz ordaz 500 poniente",
    );
    expect(normalizeAddress("Calz. de Guadalupe 10 Nte")).toBe("calzada de guadalupe 10 norte");
    expect(normalizeAddress("Carr. 57 Km 12")).toBe("carretera 57 km 12");
  });

  it("no junta direcciones distintas: otro número o interior sigue siendo otra dirección", () => {
    expect(normalizeAddress("Av. Aguascalientes 123")).not.toBe(
      normalizeAddress("Av. Aguascalientes 125"),
    );
    expect(normalizeAddress("Av. Aguascalientes 123 Int. 2")).toBe(
      "avenida aguascalientes 123 interior 2",
    );
    expect(normalizeAddress("Av. Aguascalientes 123 Int. 2")).not.toBe(
      normalizeAddress("Av. Aguascalientes 123 Int. 3"),
    );
  });

  it("es estable: normalizar dos veces no cambia el resultado", () => {
    const una = normalizeAddress("Av. Universidad No. 1000, Fracc. Bosques");
    expect(normalizeAddress(una)).toBe(una);
  });
});

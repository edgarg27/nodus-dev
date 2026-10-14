import { describe, expect, it } from "vitest";
import {
  formatearNumeroPropietario,
  leerNumeroPropietario,
} from "../../src/lib/numero-propietario.ts";

describe("número de propietario", () => {
  it("se muestra con P- y al menos cuatro cifras", () => {
    expect(formatearNumeroPropietario(7)).toBe("P-0007");
    expect(formatearNumeroPropietario(783)).toBe("P-0783");
    expect(formatearNumeroPropietario(12345)).toBe("P-12345");
    expect(formatearNumeroPropietario(null)).toBeNull();
  });

  it("se reconoce como se dicte al buscarlo", () => {
    for (const texto of ["P-0783", "p783", "#783", "783", " P-783 "]) {
      expect(leerNumeroPropietario(texto)).toBe(783);
    }
  });

  it("un nombre o un correo no es un número", () => {
    expect(leerNumeroPropietario("Juan Carlos")).toBeNull();
    expect(leerNumeroPropietario("juan@correo.com")).toBeNull();
    expect(leerNumeroPropietario("P-0")).toBeNull();
  });
});

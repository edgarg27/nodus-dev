import { describe, expect, it } from "vitest";
import { usaLaRed } from "../../src/lib/red-acceso.ts";

describe("usaLaRed", () => {
  it("el dueño directo no usa la Red", () => {
    expect(usaLaRed({ isBroker: false, tipoAnunciante: "particular" })).toBe(false);
  });

  it("la inmobiliaria, aunque todavía no sea broker aprobado, sí la usa", () => {
    expect(usaLaRed({ isBroker: false, tipoAnunciante: "inmobiliaria" })).toBe(true);
  });

  it("un broker aprobado la usa aunque se haya registrado como dueño", () => {
    expect(usaLaRed({ isBroker: true, tipoAnunciante: "particular" })).toBe(true);
  });

  it("una cuenta anterior sin tipo capturado la conserva", () => {
    expect(usaLaRed({ isBroker: false, tipoAnunciante: null })).toBe(true);
    expect(usaLaRed({ isBroker: false })).toBe(true);
  });
});

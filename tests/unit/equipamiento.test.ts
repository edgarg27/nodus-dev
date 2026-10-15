import { describe, expect, it } from "vitest";
import { equipamientoDeTipo, limpiarEquipamiento } from "../../src/lib/equipamiento.ts";

describe("equipamiento", () => {
  it("cada tipo ve lo general más lo suyo", () => {
    const oficina = equipamientoDeTipo("oficina");
    expect(oficina).toContain("planta_emergencia");
    expect(oficina).toContain("sala_juntas");
    expect(oficina).not.toContain("patio_maniobras");

    const nave = equipamientoDeTipo("nave_industrial");
    expect(nave).toContain("plafon");
    expect(nave).toContain("contra_incendios");
    expect(nave).not.toContain("frente_calle");

    expect(equipamientoDeTipo("local_comercial")).toContain("plaza_comercial");
  });

  it("al guardar descarta lo que no toca al tipo, lo desconocido y lo repetido", () => {
    expect(
      limpiarEquipamiento("oficina", [
        "elevador",
        "patio_maniobras",
        "inventado",
        "iluminacion",
        "elevador",
      ]),
    ).toEqual(["iluminacion", "elevador"]);
  });

  it("si cambia el tipo, lo que ya no aplica deja de mostrarse", () => {
    expect(limpiarEquipamiento("local_comercial", ["sala_juntas", "frente_calle"])).toEqual([
      "frente_calle",
    ]);
  });
});

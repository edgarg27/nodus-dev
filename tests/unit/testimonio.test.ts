import { describe, expect, it } from "vitest";
import { type Testimonio, testimonioEnIdioma, testimonioSchema } from "../../src/lib/testimonio.ts";

const base: Testimonio = {
  cita: "Encontramos la nave en dos semanas.",
  nombre: "Ana Ruiz",
  cargo: "Directora, Empresa",
  citaEn: null,
  cargoEn: null,
  visible: true,
};

describe("testimonio de la portada", () => {
  it("en español muestra el texto principal aunque exista versión en inglés", () => {
    const vista = testimonioEnIdioma(
      { ...base, citaEn: "We found it.", cargoEn: "Director" },
      "es",
    );
    expect(vista).toEqual({ cita: base.cita, nombre: base.nombre, cargo: base.cargo });
  });

  it("en inglés usa la versión en inglés y, campo por campo, cae al español si falta", () => {
    const vista = testimonioEnIdioma({ ...base, citaEn: "We found it.", cargoEn: "" }, "en");
    expect(vista).toEqual({ cita: "We found it.", nombre: base.nombre, cargo: base.cargo });
  });

  it("exige frase, nombre y cargo; el inglés es opcional", () => {
    expect(testimonioSchema.safeParse({ ...base, citaEn: "", cargoEn: null }).success).toBe(true);
    expect(testimonioSchema.safeParse({ ...base, cita: "   " }).success).toBe(false);
    expect(testimonioSchema.safeParse({ ...base, nombre: "" }).success).toBe(false);
  });

  it("rechaza una frase más larga que el límite", () => {
    expect(testimonioSchema.safeParse({ ...base, cita: "a".repeat(401) }).success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { rangoATexto, textoARango } from "./precio-rango";

describe("textoARango", () => {
  it("vacío es sin dato", () => {
    expect(textoARango("")).toEqual({ desde: null, hasta: null });
    expect(textoARango(undefined)).toEqual({ desde: null, hasta: null });
  });

  it("un solo número, con comas", () => {
    expect(textoARango("1,200.50")).toEqual({ desde: 1200.5, hasta: null });
  });

  it("rango con guion, con o sin espacios, o con 'a'", () => {
    expect(textoARango("450 - 1200")).toEqual({ desde: 450, hasta: 1200 });
    expect(textoARango("67.5-180")).toEqual({ desde: 67.5, hasta: 180 });
    expect(textoARango("450 – 1,200")).toEqual({ desde: 450, hasta: 1200 });
    expect(textoARango("450 a 1200")).toEqual({ desde: 450, hasta: 1200 });
  });

  it("rechaza texto, negativos, rangos al revés o de tres partes", () => {
    expect(textoARango("abc")).toBeNull();
    expect(textoARango("-450")).toBeNull();
    expect(textoARango("1200 - 450")).toBeNull();
    expect(textoARango("450 - 450")).toBeNull();
    expect(textoARango("1 - 2 - 3")).toBeNull();
    expect(textoARango("450 -")).toBeNull();
  });
});

describe("rangoATexto", () => {
  it("arma el texto de la casilla", () => {
    expect(rangoATexto(null, null)).toBe("");
    expect(rangoATexto(450, null)).toBe("450");
    expect(rangoATexto(450, 1200)).toBe("450 - 1200");
  });
});

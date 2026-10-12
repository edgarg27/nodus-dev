import { describe, expect, it } from "vitest";
import {
  documentosFaltantes,
  documentosRequeridos,
  esTipoDocumento,
} from "../../src/lib/verificacion.ts";

describe("documentos de verificación", () => {
  it("al broker se le pide identificación y acreditación; al dueño, identificación y comprobante", () => {
    expect(documentosRequeridos("broker")).toEqual(["identificacion", "acreditacion_broker"]);
    expect(documentosRequeridos("dueno")).toEqual(["identificacion", "comprobante_propiedad"]);
  });

  it("un tipo de solicitud desconocido se trata como dueño", () => {
    expect(documentosRequeridos("otro")).toEqual(documentosRequeridos("dueno"));
  });

  it("faltan los requeridos que no se han subido, en el orden en que se piden", () => {
    expect(documentosFaltantes("broker", [])).toEqual(["identificacion", "acreditacion_broker"]);
    expect(documentosFaltantes("broker", [{ tipo: "identificacion" }])).toEqual([
      "acreditacion_broker",
    ]);
    expect(
      documentosFaltantes("dueno", [{ tipo: "comprobante_propiedad" }, { tipo: "identificacion" }]),
    ).toEqual([]);
  });

  it("un documento de otro tipo de solicitud no cuenta", () => {
    expect(
      documentosFaltantes("dueno", [{ tipo: "identificacion" }, { tipo: "acreditacion_broker" }]),
    ).toEqual(["comprobante_propiedad"]);
  });

  it("solo reconoce los tipos de documento del catálogo", () => {
    expect(esTipoDocumento("identificacion")).toBe(true);
    expect(esTipoDocumento("pasaporte")).toBe(false);
    expect(esTipoDocumento(null)).toBe(false);
  });
});

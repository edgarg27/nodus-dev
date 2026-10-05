import { describe, expect, it } from "vitest";
import { estadoDesdeGeocode } from "./property-form-schema";

describe("estadoDesdeGeocode", () => {
  it("mapea los estados de Nodus aunque vengan con acentos o mayúsculas", () => {
    expect(estadoDesdeGeocode("San Luis Potosí")).toBe("SLP");
    expect(estadoDesdeGeocode("AGUASCALIENTES")).toBe("Aguascalientes");
  });

  it("León viene como región Guanajuato: solo se acepta con la ciudad León", () => {
    expect(estadoDesdeGeocode("Guanajuato", "León")).toBe("Leon");
    expect(estadoDesdeGeocode("Guanajuato", "Irapuato")).toBeNull();
    expect(estadoDesdeGeocode("Guanajuato")).toBeNull();
  });

  it("devuelve null fuera de los mercados o sin región", () => {
    expect(estadoDesdeGeocode("Sonora", "Hermosillo")).toBeNull();
    expect(estadoDesdeGeocode(null)).toBeNull();
  });
});

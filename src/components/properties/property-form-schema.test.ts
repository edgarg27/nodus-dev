import { describe, expect, it } from "vitest";
import { estadoDesdeGeocode } from "./property-form-schema";

describe("estadoDesdeGeocode", () => {
  it("mapea los estados aunque vengan con acentos o mayúsculas", () => {
    expect(estadoDesdeGeocode("San Luis Potosí")).toBe("SLP");
    expect(estadoDesdeGeocode("AGUASCALIENTES")).toBe("Aguascalientes");
  });

  it("acepta cualquier estado de México, sin depender de la ciudad", () => {
    expect(estadoDesdeGeocode("Guanajuato", "León")).toBe("Guanajuato");
    expect(estadoDesdeGeocode("Guanajuato", "Irapuato")).toBe("Guanajuato");
    expect(estadoDesdeGeocode("Sonora", "Hermosillo")).toBe("Sonora");
    expect(estadoDesdeGeocode("Ciudad de México")).toBe("Ciudad de Mexico");
  });

  it("devuelve null sin región o con una que no es un estado de México", () => {
    expect(estadoDesdeGeocode(null)).toBeNull();
    expect(estadoDesdeGeocode("Texas")).toBeNull();
  });
});

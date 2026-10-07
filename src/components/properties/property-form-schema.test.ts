import { describe, expect, it } from "vitest";
import { textosDe } from "@/lib/i18n";
import { crearPropertyFormSchema, estadoDesdeGeocode } from "./property-form-schema";

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

describe("crearPropertyFormSchema", () => {
  it("usa los mensajes de validación del idioma activo", () => {
    const esquema = crearPropertyFormSchema(textosDe("en").panel.formulario);
    const resultado = esquema.safeParse({
      tipo: "oficina",
      modalidad: "renta",
      direccion: "",
      lat: 22.15,
      lng: -100.97,
      estado: "SLP",
      ciudad: "San Luis Potosí",
      descripcion: "Oficina",
      aceptaFinanciamiento: "false",
      moneda: "MXN",
      precioUnidad: "total",
      banos: "2.5",
    });
    expect(resultado.success).toBe(false);
    const mensajes = resultado.error?.issues.map((issue) => issue.message) ?? [];
    expect(mensajes).toContain("Address is required");
    expect(mensajes).toContain("Enter a whole number");
  });
});

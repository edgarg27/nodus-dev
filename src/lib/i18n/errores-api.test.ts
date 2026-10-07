import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mensajeDeErrorApi, traducirMensajeApi } from "./errores-api";

function archivos(directorio: string): string[] {
  return readdirSync(directorio).flatMap((nombre) => {
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return ruta.endsWith(".ts") && !ruta.endsWith(".test.ts") ? [ruta] : [];
  });
}

// Mensajes literales que la API puede devolver: los de errorEnvelope/respuestaError/noEncontrado
// y los `message: "…"` de los resultados del servidor y del proxy.
function mensajesDeLaApi(): string[] {
  const fuentes = [...archivos("src/app/api"), ...archivos("src/server"), "src/proxy.ts"];
  const patrones = [
    /errorEnvelope\("[a-z_]+", "([^"]+)"/g,
    /respuestaError\(\d+, "[a-z_]+", "([^"]+)"/g,
    /noEncontrado\("([^"]+)"\)/g,
    /message: "([^"]+)"/g,
  ];
  const mensajes = new Set<string>();
  for (const ruta of fuentes) {
    const texto = readFileSync(ruta, "utf8");
    for (const patron of patrones) {
      for (const coincidencia of texto.matchAll(patron)) mensajes.add(coincidencia[1] as string);
    }
  }
  // "duplicado" es interno: el formulario lo reconoce por su `code` y nunca lo muestra.
  mensajes.delete("duplicado");
  return [...mensajes];
}

describe("traducirMensajeApi", () => {
  it("todo mensaje de error literal de la API tiene traducción al inglés", () => {
    const mensajes = mensajesDeLaApi();
    expect(mensajes.length).toBeGreaterThan(20);
    const sinTraduccion = mensajes.filter((mensaje) => traducirMensajeApi(mensaje, "en") === null);
    expect(sinTraduccion).toEqual([]);
  });

  it("traduce los mensajes con números variables", () => {
    expect(
      traducirMensajeApi(
        "Puedes guardar hasta 20 búsquedas. Borra alguna para guardar otra.",
        "en",
      ),
    ).toBe("You can save up to 20 searches. Delete one to save another.");
  });
});

describe("mensajeDeErrorApi", () => {
  const cuerpo = {
    error: {
      code: "validation_error",
      message: "Datos inválidos",
      details: [{ field: "valor", message: "Correo inválido" }],
    },
  };

  it("en español muestra el mensaje de la API tal cual", () => {
    expect(mensajeDeErrorApi(cuerpo, "es", "Genérico")).toBe("Datos inválidos");
    expect(mensajeDeErrorApi(cuerpo, "es", "Genérico", { detalle: true })).toBe("Correo inválido");
  });

  it("en inglés lo traduce y prioriza el detalle cuando se pide", () => {
    expect(mensajeDeErrorApi(cuerpo, "en", "Generic")).toBe("Some fields are invalid.");
    expect(mensajeDeErrorApi(cuerpo, "en", "Generic", { detalle: true })).toBe("Invalid email.");
  });

  it("sin mensaje o sin traducción usa el genérico", () => {
    expect(mensajeDeErrorApi(null, "es", "Genérico")).toBe("Genérico");
    expect(mensajeDeErrorApi({ error: { message: "Algo nuevo" } }, "en", "Generic")).toBe(
      "Generic",
    );
  });
});

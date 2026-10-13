import { afterEach, describe, expect, it, vi } from "vitest";

// `env` se lee al importar el módulo: cada caso fija la variable y vuelve a importarlo.
async function cargar(whatsapp: string | undefined) {
  vi.resetModules();
  if (whatsapp === undefined) vi.stubEnv("NEXT_PUBLIC_CAPTIVE_WHATSAPP", "");
  else vi.stubEnv("NEXT_PUBLIC_CAPTIVE_WHATSAPP", whatsapp);
  return import("../../src/lib/captive-ayuda.ts");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("hrefAyudaCaptive", () => {
  it("con número configurado abre WhatsApp con la búsqueda ya escrita, sin pedir sesión", async () => {
    const { hrefAyudaCaptive, esEnlaceWhatsapp } = await cargar("+52 1 449 123 4567");
    const href = hrefAyudaCaptive(false, { tipo: "oficina", estado: "Aguascalientes" }, "es");

    expect(esEnlaceWhatsapp(href)).toBe(true);
    const url = new URL(href);
    expect(url.pathname).toBe("/5214491234567");
    const mensaje = url.searchParams.get("text") ?? "";
    expect(mensaje).toContain("Estaba buscando:");
    expect(mensaje).toContain("Aguascalientes");
  });

  it("a un número de 10 dígitos (sin lada del país) le antepone el 52 de México", async () => {
    const { hrefAyudaCaptive } = await cargar("449 123 4567");

    expect(new URL(hrefAyudaCaptive(false, {}, "es")).pathname).toBe("/524491234567");
  });

  it("sin filtros manda el mensaje general, en el idioma del visitante", async () => {
    const { hrefAyudaCaptive } = await cargar("5214491234567");

    const es = new URL(hrefAyudaCaptive(true, {}, "es")).searchParams.get("text") ?? "";
    const en = new URL(hrefAyudaCaptive(true, {}, "en")).searchParams.get("text") ?? "";
    expect(es).toContain("¿Me pueden ayudar?");
    expect(es).not.toContain("Estaba buscando");
    expect(en).not.toBe(es);
  });

  it("sin número configurado conserva el chat de la web (con inicio de sesión si hace falta)", async () => {
    const { hrefAyudaCaptive, esEnlaceWhatsapp } = await cargar(undefined);

    expect(hrefAyudaCaptive(true, {}, "es")).toBe("/mensajes/captive?ayuda=1");
    const visitante = hrefAyudaCaptive(false, { tipo: "oficina" }, "es");
    expect(visitante.startsWith("/sign-in?next=")).toBe(true);
    expect(esEnlaceWhatsapp(visitante)).toBe(false);
  });
});

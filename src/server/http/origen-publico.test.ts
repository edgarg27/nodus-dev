import { afterEach, describe, expect, it, vi } from "vitest";

async function cargar() {
  vi.resetModules();
  return import("./origen-publico.ts");
}

// Así llega la petición detrás de Caddy: la dirección interna del contenedor.
const peticionInterna = new Request("https://0.0.0.0:3000/auth/confirm?token_hash=x&type=email");

describe("origenPublico / urlPublica", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("con NEXT_PUBLIC_SITE_URL usa el dominio público, no la dirección interna", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://captivecenter.nodus.mx/");
    const { origenPublico, urlPublica } = await cargar();

    expect(origenPublico(peticionInterna)).toBe("https://captivecenter.nodus.mx");
    expect(urlPublica("/sign-in?error=confirmacion", peticionInterna).toString()).toBe(
      "https://captivecenter.nodus.mx/sign-in?error=confirmacion",
    );
  });

  it("sin NEXT_PUBLIC_SITE_URL (desarrollo local) usa el origen de la petición", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    const { urlPublica } = await cargar();

    const local = new Request("http://localhost:3000/auth/confirm");
    expect(urlPublica("/panel", local).toString()).toBe("http://localhost:3000/panel");
  });

  it("ignora el encabezado Host de la petición", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://captivecenter.nodus.mx");
    const { urlPublica } = await cargar();

    const conHostFalso = new Request("https://0.0.0.0:3000/auth/confirm", {
      headers: { host: "sitio-malicioso.com", "x-forwarded-host": "sitio-malicioso.com" },
    });
    expect(urlPublica("/inicio", conHostFalso).host).toBe("captivecenter.nodus.mx");
  });
});

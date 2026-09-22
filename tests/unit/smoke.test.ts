import { describe, expect, it } from "vitest";
import Layout from "../../src/app/layout.tsx";
import { env } from "../../src/lib/env.ts";

describe("smoke", () => {
  it("env expone las 7 claves como propiedades", () => {
    const keys = [
      "DATABASE_URL",
      "DIRECT_URL",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "NEXT_PUBLIC_MAPTILER_KEY",
      "MAPTILER_API_KEY",
    ];
    for (const key of keys) {
      expect(key in env).toBe(true);
    }
  });

  it("src/app/layout.tsx exporta un componente por defecto", () => {
    expect(typeof Layout).toBe("function");
  });
});

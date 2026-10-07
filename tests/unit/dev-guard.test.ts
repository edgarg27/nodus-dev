import { describe, expect, it } from "vitest";
import { assertSafeToReset, assertSafeToResetTests } from "../../src/lib/db/dev-guard.ts";

const base = {
  NODUS_ALLOW_DB_RESET: "yes",
  NODUS_DEV_PROJECT_REF: "devref",
  DATABASE_URL: "postgresql://postgres.devref:pw@aws-0-region.pooler.supabase.com:6543/postgres",
  DIRECT_URL: "postgresql://postgres.devref:pw@aws-0-region.pooler.supabase.com:5432/postgres",
  NEXT_PUBLIC_SUPABASE_URL: "https://devref.supabase.co",
};

describe("assertSafeToReset", () => {
  it("sin NODUS_ALLOW_DB_RESET lanza y nombra la variable", () => {
    const { NODUS_ALLOW_DB_RESET: _omit, ...env } = base;
    expect(() => assertSafeToReset(env)).toThrowError(/NODUS_ALLOW_DB_RESET/);
  });

  it('con NODUS_ALLOW_DB_RESET distinto de "yes" lanza', () => {
    expect(() => assertSafeToReset({ ...base, NODUS_ALLOW_DB_RESET: "true" })).toThrowError(
      /NODUS_ALLOW_DB_RESET/,
    );
  });

  it("sin NODUS_DEV_PROJECT_REF, o con una cadena que no lo contiene, lanza y nombra la variable", () => {
    const { NODUS_DEV_PROJECT_REF: _omit, ...sinRef } = base;
    expect(() => assertSafeToReset(sinRef)).toThrowError(/NODUS_DEV_PROJECT_REF/);

    expect(() =>
      assertSafeToReset({
        ...base,
        DATABASE_URL: "postgresql://postgres.otroref:pw@host:6543/postgres",
      }),
    ).toThrowError(/DATABASE_URL/);
  });

  it("con NODUS_PROD_PROJECT_REF contenida en una cadena lanza sin imprimir la cadena", () => {
    const env = {
      ...base,
      NODUS_PROD_PROJECT_REF: "prodref",
      DATABASE_URL:
        "postgresql://postgres.prodref:pw@aws-0-region.pooler.supabase.com:6543/postgres",
    };
    expect(() => assertSafeToReset(env)).toThrowError();
    try {
      assertSafeToReset(env);
    } catch (error) {
      expect((error as Error).message).not.toContain("postgresql://");
      expect((error as Error).message).not.toContain(env.DATABASE_URL);
    }
  });

  it("con entorno completo y correcto devuelve sin lanzar", () => {
    expect(() => assertSafeToReset(base)).not.toThrow();
  });
});

const pruebas = {
  NODUS_ALLOW_DB_RESET: "yes",
  NODUS_DEV_PROJECT_REF: "devref",
  NODUS_TEST_PROJECT_REF: "testref",
  DATABASE_URL: "postgresql://postgres.testref:pw@aws-0-region.pooler.supabase.com:6543/postgres",
  DIRECT_URL: "postgresql://postgres.testref:pw@aws-0-region.pooler.supabase.com:5432/postgres",
  NEXT_PUBLIC_SUPABASE_URL: "https://testref.supabase.co",
};

describe("assertSafeToResetTests", () => {
  it("con el proyecto de pruebas bien configurado devuelve sin lanzar", () => {
    expect(() => assertSafeToResetTests(pruebas)).not.toThrow();
  });

  it("sin NODUS_TEST_PROJECT_REF lanza y explica cómo crear .env.test", () => {
    const { NODUS_TEST_PROJECT_REF: _omit, ...sinRef } = pruebas;
    expect(() => assertSafeToResetTests(sinRef)).toThrowError(/NODUS_TEST_PROJECT_REF.*.env.test/);
  });

  it("se niega a vaciar nodus-dev: con las conexiones de dev lanza", () => {
    expect(() =>
      assertSafeToResetTests({ ...base, NODUS_TEST_PROJECT_REF: "testref" }),
    ).toThrowError(/proyecto de pruebas/);
    expect(() =>
      assertSafeToResetTests({ ...pruebas, NODUS_TEST_PROJECT_REF: "devref" }),
    ).toThrowError(/NODUS_DEV_PROJECT_REF/);
  });

  it("lanza si una conexión contiene el ref de dev o de producción", () => {
    expect(() =>
      assertSafeToResetTests({
        ...pruebas,
        DIRECT_URL: "postgresql://postgres.testref:pw@host/devref",
      }),
    ).toThrowError(/proyecto dev/);
    expect(() =>
      assertSafeToResetTests({
        ...pruebas,
        NODUS_PROD_PROJECT_REF: "prodref",
        DATABASE_URL: "postgresql://postgres.testref:pw@host/prodref",
      }),
    ).toThrowError(/producción/);
  });

  it("sin NODUS_ALLOW_DB_RESET lanza", () => {
    expect(() => assertSafeToResetTests({ ...pruebas, NODUS_ALLOW_DB_RESET: "" })).toThrowError(
      /NODUS_ALLOW_DB_RESET/,
    );
  });
});

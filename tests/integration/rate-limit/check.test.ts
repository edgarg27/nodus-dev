import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verificarLimite } from "../../../src/server/rate-limit/check.ts";
import { resetTestDatabase } from "../../helpers/reset-db.ts";

beforeEach(async () => {
  await resetTestDatabase();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime("2026-01-01T12:00:10Z");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("verificarLimite", () => {
  it("permite hasta max, bloquea la número 11 y no afecta otra clave", async () => {
    const clave = `contact:${randomUUID()}`;
    for (let i = 0; i < 10; i++) {
      const resultado = await verificarLimite(clave, { max: 10 });
      expect(resultado.ok).toBe(true);
    }

    const bloqueada = await verificarLimite(clave, { max: 10 });
    expect(bloqueada.ok).toBe(false);
    expect(bloqueada.retryAfterSegundos).toBeGreaterThanOrEqual(1);
    expect(bloqueada.retryAfterSegundos).toBeLessThanOrEqual(60);

    const otraClave = await verificarLimite(`contact:${randomUUID()}`, { max: 10 });
    expect(otraClave.ok).toBe(true);
  });

  it("tras 61 segundos la misma clave vuelve a permitir", async () => {
    const clave = `contact:${randomUUID()}`;
    for (let i = 0; i < 10; i++) {
      await verificarLimite(clave, { max: 10 });
    }
    const bloqueada = await verificarLimite(clave, { max: 10 });
    expect(bloqueada.ok).toBe(false);

    vi.setSystemTime("2026-01-01T12:01:11Z");
    const permitida = await verificarLimite(clave, { max: 10 });
    expect(permitida.ok).toBe(true);
  });

  it("15 llamadas concurrentes con max 10 permiten exactamente 10 y bloquean 5", async () => {
    const clave = `contact:${randomUUID()}`;
    const resultados = await Promise.all(
      Array.from({ length: 15 }, () => verificarLimite(clave, { max: 10 })),
    );

    const permitidas = resultados.filter((r) => r.ok);
    const bloqueadas = resultados.filter((r) => !r.ok);
    expect(permitidas).toHaveLength(10);
    expect(bloqueadas).toHaveLength(5);
  });
});

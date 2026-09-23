import { describe, expect, it } from "vitest";
import { generarBrokerCode } from "../../src/server/broker-requests/broker-code.ts";

describe("generarBrokerCode", () => {
  it("1000 códigos cumplen el formato BRK-XXXXXX y al menos 990 son distintos entre sí", () => {
    const codigos = Array.from({ length: 1000 }, () => generarBrokerCode());

    for (const codigo of codigos) {
      expect(codigo).toMatch(/^BRK-[A-HJ-NP-Z2-9]{6}$/);
    }

    const distintos = new Set(codigos);
    expect(distintos.size).toBeGreaterThanOrEqual(990);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manejarError } from "../../../src/server/http/handle-error.ts";

describe("manejarError", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("responde 500 con request_id y loguea una línea JSON con el mismo request_id", async () => {
    const request = new Request("http://localhost/api/v1/algo", { method: "POST" });
    const respuesta = manejarError(new Error("fallo sintético"), request);

    expect(respuesta.status).toBe(500);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("internal_error");
    expect(typeof cuerpo.error.request_id).toBe("string");
    expect(cuerpo.error.request_id.length).toBeGreaterThan(0);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const linea = JSON.parse(consoleErrorSpy.mock.calls[0]?.[0] as string);
    expect(linea.requestId).toBe(cuerpo.error.request_id);
    expect(linea.nivel).toBe("error");
  });
});

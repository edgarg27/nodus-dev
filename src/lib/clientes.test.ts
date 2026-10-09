import { describe, expect, it } from "vitest";
import { estadoDeCliente, finDelDia, leerParamsClientes, siguientePaso } from "./clientes";

describe("estadoDeCliente", () => {
  it("sin solicitudes para Captive no tiene etapa", () => {
    expect(estadoDeCliente([])).toBeNull();
  });

  it("pendiente si alguna solicitud sigue nueva", () => {
    expect(estadoDeCliente(["cerrada", "nueva", "con_broker"])).toBe("pendiente");
  });

  it("cerrado solo si todas terminaron", () => {
    expect(estadoDeCliente(["cerrada", "descartada"])).toBe("cerrado");
    expect(estadoDeCliente(["cerrada", "con_cliente"])).toBe("seguimiento");
  });
});

describe("siguientePaso", () => {
  it("avanza nueva → con el broker → con el cliente → cerrada, y ahí se detiene", () => {
    expect(siguientePaso("nueva")).toBe("con_broker");
    expect(siguientePaso("con_broker")).toBe("con_cliente");
    expect(siguientePaso("con_cliente")).toBe("cerrada");
    expect(siguientePaso("cerrada")).toBeNull();
    expect(siguientePaso("descartada")).toBeNull();
  });
});

describe("finDelDia", () => {
  it("es las 23:59:59.999 del mismo día en la Ciudad de México (UTC-6)", () => {
    // 10:30 en CDMX del 8 de octubre.
    expect(finDelDia(new Date("2026-10-08T16:30:00Z")).toISOString()).toBe(
      "2026-10-09T05:59:59.999Z",
    );
  });

  it("de noche en UTC todavía cuenta como el día de México", () => {
    // 23:00 en CDMX del 8 de octubre = 05:00 UTC del 9.
    expect(finDelDia(new Date("2026-10-09T05:00:00Z")).toISOString()).toBe(
      "2026-10-09T05:59:59.999Z",
    );
  });
});

describe("leerParamsClientes", () => {
  it("ignora valores desconocidos", () => {
    const valores: Record<string, string> = { vista: "otra", estado: "ganado", pagina: "-2" };
    expect(leerParamsClientes((clave) => valores[clave])).toEqual({
      q: "",
      vista: "solicitudes",
      estado: null,
      pagina: 1,
    });
  });
});

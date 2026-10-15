import { describe, expect, it } from "vitest";
import { estadoSolicitudCliente, solicitudEnCurso } from "../../src/lib/solicitud-cliente.ts";

describe("estadoSolicitudCliente", () => {
  it("traduce los pasos de Captive a lo que ve el cliente", () => {
    expect(estadoSolicitudCliente("captive", "nueva")).toBe("recibida");
    expect(estadoSolicitudCliente("captive", "con_broker")).toBe("confirmando");
    expect(estadoSolicitudCliente("captive", "con_cliente")).toBe("en_contacto");
    expect(estadoSolicitudCliente("captive", "cerrada")).toBe("concluida");
    expect(estadoSolicitudCliente("captive", "descartada")).toBe("concluida");
  });

  it("las solicitudes directas (anteriores) solo dicen que se enviaron", () => {
    expect(estadoSolicitudCliente("directo", "nueva")).toBe("enviada");
    expect(estadoSolicitudCliente("directo", "con_cliente")).toBe("enviada");
  });

  it("solo las que Captive sigue atendiendo cuentan como en curso", () => {
    expect(solicitudEnCurso("recibida")).toBe(true);
    expect(solicitudEnCurso("en_contacto")).toBe(true);
    expect(solicitudEnCurso("concluida")).toBe(false);
    expect(solicitudEnCurso("enviada")).toBe(false);
  });
});

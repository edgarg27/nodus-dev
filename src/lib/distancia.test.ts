import { describe, expect, it } from "vitest";
import { cajaAlrededor, distanciaEnMetros, RADIO_POSIBLE_DUPLICADO_M } from "./distancia";

const centro = { lat: 21.88234, lng: -102.28259 };

describe("distanciaEnMetros", () => {
  it("es cero en el mismo punto", () => {
    expect(distanciaEnMetros(centro, centro)).toBe(0);
  });

  it("0.0001° de latitud son unos 11 metros", () => {
    const d = distanciaEnMetros(centro, { lat: centro.lat + 0.0001, lng: centro.lng });
    expect(d).toBeGreaterThan(10.5);
    expect(d).toBeLessThan(11.7);
  });

  it("distingue lo que cae dentro y fuera del radio de posible duplicado", () => {
    const cerca = { lat: centro.lat + 0.0003, lng: centro.lng };
    const lejos = { lat: centro.lat + 0.001, lng: centro.lng };
    expect(distanciaEnMetros(centro, cerca)).toBeLessThan(RADIO_POSIBLE_DUPLICADO_M);
    expect(distanciaEnMetros(centro, lejos)).toBeGreaterThan(RADIO_POSIBLE_DUPLICADO_M);
  });
});

describe("cajaAlrededor", () => {
  it("contiene todo el círculo: sus bordes quedan justo al radio", () => {
    const caja = cajaAlrededor(centro, 50);
    expect(distanciaEnMetros(centro, { lat: caja.latMax, lng: centro.lng })).toBeCloseTo(50, 0);
    expect(distanciaEnMetros(centro, { lat: centro.lat, lng: caja.lngMin })).toBeCloseTo(50, 0);
  });
});

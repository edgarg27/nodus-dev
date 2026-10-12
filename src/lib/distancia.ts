// Distancias cortas entre dos puntos del mapa, para detectar propiedades "posibles duplicados".

// Radio dentro del cual otra propiedad del mismo tipo se considera posible duplicado. No bloquea
// (pueden ser dos oficinas del mismo edificio): avisa a quien publica y al admin que revisa.
export const RADIO_POSIBLE_DUPLICADO_M = 50;

const RADIO_TIERRA_M = 6_371_000;
const METROS_POR_GRADO = 111_320;

function aRadianes(grados: number): number {
  return (grados * Math.PI) / 180;
}

// Distancia en metros entre dos coordenadas (fórmula de haversine).
export function distanciaEnMetros(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = aRadianes(b.lat - a.lat);
  const dLng = aRadianes(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aRadianes(a.lat)) * Math.cos(aRadianes(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.sqrt(h));
}

// Rectángulo que contiene el círculo de `radioM` metros alrededor del punto: sirve para filtrar en
// la base antes de medir la distancia exacta.
export function cajaAlrededor(punto: { lat: number; lng: number }, radioM: number) {
  const dLat = radioM / METROS_POR_GRADO;
  const dLng = radioM / (METROS_POR_GRADO * Math.cos(aRadianes(punto.lat)));
  return {
    latMin: punto.lat - dLat,
    latMax: punto.lat + dLat,
    lngMin: punto.lng - dLng,
    lngMax: punto.lng + dLng,
  };
}

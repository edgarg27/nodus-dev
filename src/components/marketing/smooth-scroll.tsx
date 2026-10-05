"use client";

import { useEffect } from "react";

const FACTOR_SUAVIZADO = 0.1;
const UMBRAL_DETENCION_PX = 0.5;
const ALTURA_LINEA_PX = 16;

function tieneScrollPropio(elemento: Element): boolean {
  const estilo = getComputedStyle(elemento);
  return /(auto|scroll)/.test(estilo.overflowY) && elemento.scrollHeight > elemento.clientHeight;
}

function buscarContenedorConScroll(nodo: Element | null): Element | null {
  let actual = nodo;
  while (actual && actual !== document.body) {
    if (tieneScrollPropio(actual)) return actual;
    actual = actual.parentElement;
  }
  return null;
}

// Desactiva el scroll nativo por rueda del mouse y lo reemplaza por uno amortiguado (lerp), para
// que avanzar por la landing se sienta fluido en vez de saltar de golpe con cada "tick" de la
// rueda. Respeta prefers-reduced-motion y nunca interfiere con el scroll dentro de un contenedor
// propio (diálogos, menús desplegables, selects).
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let objetivoY = window.scrollY;
    let actualY = window.scrollY;
    let cuadroAnimacion: number | null = null;

    function animar() {
      actualY += (objetivoY - actualY) * FACTOR_SUAVIZADO;
      if (Math.abs(objetivoY - actualY) < UMBRAL_DETENCION_PX) {
        actualY = objetivoY;
        cuadroAnimacion = null;
      } else {
        cuadroAnimacion = requestAnimationFrame(animar);
      }
      // `behavior: "instant"` es obligatorio aquí: el `<html>` tiene `scroll-behavior: smooth`
      // (para los saltos de ancla del menú) y sin esto el navegador intentaría suavizar también
      // cada una de estas llamadas — como llega una nueva antes de que termine la anterior, el
      // scroll se traba y luego salta en vez de avanzar fluido.
      window.scrollTo({ top: actualY, left: 0, behavior: "instant" });
    }

    function alHacerScroll(evento: WheelEvent) {
      if (evento.target instanceof Element && buscarContenedorConScroll(evento.target)) {
        return;
      }

      evento.preventDefault();
      const deltaPx = evento.deltaMode === 1 ? evento.deltaY * ALTURA_LINEA_PX : evento.deltaY;
      const maximoY = document.documentElement.scrollHeight - window.innerHeight;
      objetivoY = Math.min(maximoY, Math.max(0, objetivoY + deltaPx));
      if (cuadroAnimacion === null) cuadroAnimacion = requestAnimationFrame(animar);
    }

    // Un salto que no viene de la rueda (enlace de ancla, teclado, barra de scroll) deja el objetivo
    // atrás; sin resincronizarlo, el siguiente giro de la rueda regresaría a la posición anterior.
    function alDesplazarse() {
      if (cuadroAnimacion !== null) return;
      objetivoY = window.scrollY;
      actualY = window.scrollY;
    }

    window.addEventListener("wheel", alHacerScroll, { passive: false });
    window.addEventListener("scroll", alDesplazarse, { passive: true });
    return () => {
      window.removeEventListener("wheel", alHacerScroll);
      window.removeEventListener("scroll", alDesplazarse);
      if (cuadroAnimacion !== null) cancelAnimationFrame(cuadroAnimacion);
    };
  }, []);

  return null;
}

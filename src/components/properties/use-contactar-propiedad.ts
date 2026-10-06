"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface ContactoRevelado {
  telefono: string | null;
  whatsappUrl: string | null;
}

// Lógica de "Contactar" compartida por la tarjeta de resultados y la ficha del espacio: crea el
// lead en POST /api/v1/contact-requests y revela el teléfono del oferente. Sin sesión, manda a
// iniciar sesión y regresa a la página actual.
export function useContactarPropiedad(propiedadId: string) {
  const router = useRouter();
  const [contacto, setContacto] = useState<ContactoRevelado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function contactar(opciones: { mensaje?: string; quiereFinanciamiento?: boolean } = {}) {
    if (enviando || contacto) return;
    setError(null);
    setEnviando(true);

    try {
      const respuesta = await fetch("/api/v1/contact-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propiedad_id: propiedadId,
          ...(opciones.mensaje?.trim() ? { mensaje: opciones.mensaje.trim() } : {}),
          ...(opciones.quiereFinanciamiento ? { quiere_financiamiento: true } : {}),
        }),
      });

      if (respuesta.status === 401) {
        const destino = `${window.location.pathname}${window.location.search}`;
        router.push(`/sign-in?next=${encodeURIComponent(destino)}`);
        return;
      }

      const cuerpo = await respuesta.json().catch(() => null);
      if (!respuesta.ok || !cuerpo?.data) {
        setError(cuerpo?.error?.message ?? "No se pudo contactar. Intenta de nuevo.");
        return;
      }

      setContacto({
        telefono: cuerpo.data.telefono_oferente,
        whatsappUrl: cuerpo.data.whatsapp_url,
      });
    } catch {
      setError("No se pudo contactar. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return { contacto, error, enviando, contactar };
}

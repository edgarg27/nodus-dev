"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useIdioma } from "@/components/i18n/idioma-provider";

export interface ContactoRevelado {
  telefono: string | null;
  whatsappUrl: string | null;
}

// Lógica de "Contactar" compartida por la tarjeta de resultados y la ficha del espacio: crea el
// lead en POST /api/v1/contact-requests y revela el teléfono del oferente. Sin sesión, manda a
// iniciar sesión y regresa a la página actual.
export function useContactarPropiedad(propiedadId: string) {
  const { idioma, t } = useIdioma();
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
        // Los mensajes de la API están en español; en inglés se muestra el genérico.
        setError(
          idioma === "es" && cuerpo?.error?.message
            ? cuerpo.error.message
            : t.contacto.errorGeneral,
        );
        return;
      }

      setContacto({
        telefono: cuerpo.data.telefono_oferente,
        whatsappUrl: cuerpo.data.whatsapp_url,
      });
    } catch {
      setError(t.contacto.errorConexion);
    } finally {
      setEnviando(false);
    }
  }

  return { contacto, error, enviando, contactar };
}

"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { mensajeDeErrorApi } from "@/lib/i18n/errores-api";
import { AgencyAvatar } from "./agency-avatar";

interface AgencyLogoFieldProps {
  nombre: string;
  logoUrl: string | null;
}

const TIPOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANO_MAXIMO = 4_000_000;

// Logo de la agencia: se sube en cuanto se elige el archivo (POST /api/v1/agency/logo) y aparece en
// la ficha pública de cada propiedad.
export function AgencyLogoField({ nombre, logoUrl }: AgencyLogoFieldProps) {
  const { idioma, t } = useIdioma();
  const a = t.panel.agencia;
  const f = t.panel.formulario;
  const router = useRouter();
  const idCampo = useId();
  const entrada = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subir(archivo: File) {
    // Las mismas reglas que el servidor, para avisar sin esperar la subida.
    if (!TIPOS.includes(archivo.type)) return setError(f.fotoTipo(archivo.name));
    if (archivo.size > TAMANO_MAXIMO) return setError(f.fotoPeso(archivo.name));
    setOcupado(true);
    setError(null);
    try {
      const datos = new FormData();
      datos.append("archivo", archivo);
      const respuesta = await fetch("/api/v1/agency/logo", { method: "POST", body: datos });
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => null);
        setError(mensajeDeErrorApi(cuerpo, idioma, a.errorLogo));
        return;
      }
      router.refresh();
    } catch {
      setError(a.errorLogo);
    } finally {
      setOcupado(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  async function quitar() {
    setOcupado(true);
    setError(null);
    try {
      const respuesta = await fetch("/api/v1/agency/logo", { method: "DELETE" });
      if (!respuesta.ok) {
        setError(a.errorLogo);
        return;
      }
      router.refresh();
    } catch {
      setError(a.errorLogo);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="text-[15px] font-bold text-foreground">{a.logo}</h2>
      <div className="flex flex-wrap items-center gap-5">
        <AgencyAvatar nombre={nombre} logoUrl={logoUrl} className="h-20 w-28 text-2xl" />
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <label
              htmlFor={idCampo}
              aria-disabled={ocupado}
              className="flex h-10 cursor-pointer items-center rounded-lg border border-input px-4 text-[13px] font-bold text-foreground transition-colors hover:border-primary aria-disabled:pointer-events-none aria-disabled:opacity-60"
            >
              {ocupado ? a.subiendoLogo : logoUrl ? a.cambiarLogo : a.subirLogo}
            </label>
            <input
              ref={entrada}
              id={idCampo}
              type="file"
              accept={TIPOS.join(",")}
              disabled={ocupado}
              className="sr-only"
              onChange={(evento) => {
                const archivo = evento.target.files?.[0];
                if (archivo) void subir(archivo);
              }}
            />
            {logoUrl ? (
              <button
                type="button"
                disabled={ocupado}
                onClick={() => void quitar()}
                className="flex h-10 cursor-pointer items-center rounded-lg px-3 text-[13px] font-semibold text-muted-foreground hover:text-destructive disabled:opacity-60"
              >
                {a.quitarLogo}
              </button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">{a.logoAyuda}</p>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}

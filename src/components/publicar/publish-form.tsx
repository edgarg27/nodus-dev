"use client";

import { cn } from "cn";
import { useState } from "react";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { digitosTelefono, type TipoAnunciante } from "@/lib/auth/datos-oferente";
import { mensajeDeErrorApi } from "@/lib/i18n/errores-api";

// Un buscador completa sus datos de anunciante y su cuenta pasa a oferente (POST
// /api/v1/me/oferente); después entra directo a publicar su primer espacio.
export function PublishForm() {
  const { idioma, t } = useIdioma();
  const p = t.panel.publicar;
  const [telefono, setTelefono] = useState("");
  const [tipo, setTipo] = useState<TipoAnunciante | null>(null);
  const [empresa, setEmpresa] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    const digitos = digitosTelefono(telefono);
    if (!/^\+?[\d\s()-]+$/.test(telefono.trim()) || digitos < 10 || digitos > 15) {
      return setError(p.errorTelefono);
    }
    if (!tipo) return setError(p.errorTipo);
    if (tipo === "inmobiliaria" && !empresa.trim()) return setError(p.errorEmpresa);

    setEnviando(true);
    setError(null);
    try {
      const respuesta = await fetch("/api/v1/me/oferente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefono: telefono.trim(),
          tipo_anunciante: tipo,
          ...(tipo === "inmobiliaria" ? { empresa: empresa.trim() } : {}),
        }),
      });
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => null);
        setError(mensajeDeErrorApi(cuerpo, idioma, p.error, { detalle: true }));
        setEnviando(false);
        return;
      }
      // Recarga completa: el menú y los permisos ya son de oferente.
      window.location.assign("/propiedades/nueva");
    } catch {
      setError(p.error);
      setEnviando(false);
    }
  }

  const campo =
    "h-[46px] w-full rounded-lg border border-input bg-background px-3.5 text-[15px] text-text outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <form
      onSubmit={enviar}
      noValidate
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-text">{p.formularioTitulo}</h2>
        <p className="text-sm text-text-muted">{p.formularioTexto}</p>
      </div>

      <label className="flex flex-col gap-2 text-[13px] font-semibold text-text">
        {p.telefono}
        <input
          type="tel"
          autoComplete="tel"
          placeholder="+52 444 123 4567"
          value={telefono}
          onChange={(evento) => setTelefono(evento.target.value)}
          className={campo}
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-[13px] font-semibold text-text">{p.comoPublicas}</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["particular", "inmobiliaria"] as const).map((valor) => (
            <label
              key={valor}
              className={cn(
                "flex h-[42px] cursor-pointer items-center justify-center rounded-lg border text-[13px] font-semibold transition-colors",
                tipo === valor
                  ? "border-accent bg-accent/10 text-text"
                  : "border-border text-text/70 hover:border-text/40",
              )}
            >
              <input
                type="radio"
                name="tipo-anunciante"
                value={valor}
                checked={tipo === valor}
                onChange={() => setTipo(valor)}
                className="sr-only"
              />
              {p[valor]}
            </label>
          ))}
        </div>
      </fieldset>

      {tipo === "inmobiliaria" ? (
        <label className="flex flex-col gap-2 text-[13px] font-semibold text-text">
          {p.empresa}
          <input
            maxLength={120}
            value={empresa}
            onChange={(evento) => setEmpresa(evento.target.value)}
            className={campo}
          />
        </label>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={enviando}
        className="flex h-12 cursor-pointer items-center justify-center rounded-lg bg-accent text-[15px] font-bold text-accent-foreground shadow-sm transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 disabled:opacity-60 motion-reduce:transition-none"
      >
        {enviando ? p.enviando : p.enviar}
      </button>
    </form>
  );
}

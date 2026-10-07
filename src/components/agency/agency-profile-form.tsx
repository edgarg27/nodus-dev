"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { mensajeDeErrorApi } from "@/lib/i18n/errores-api";

interface AgencyProfileFormProps {
  nombre: string;
  descripcion: string;
}

export function AgencyProfileForm({ nombre, descripcion }: AgencyProfileFormProps) {
  const { idioma, t } = useIdioma();
  const a = t.panel.agencia;
  const router = useRouter();
  const [nombreEditado, setNombreEditado] = useState(nombre);
  const [descripcionEditada, setDescripcionEditada] = useState(descripcion);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    setMensaje(null);
    try {
      const respuesta = await fetch("/api/v1/agency", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombreEditado, descripcion: descripcionEditada }),
      });
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => null);
        throw new Error(mensajeDeErrorApi(cuerpo, idioma, a.errorGuardar, { detalle: true }));
      }
      setMensaje({ tipo: "ok", texto: a.guardado });
      router.refresh();
    } catch (err) {
      setMensaje({
        tipo: "error",
        texto: err instanceof Error ? err.message : a.errorGuardar,
      });
    } finally {
      setGuardando(false);
    }
  }

  const claseCampo =
    "w-full rounded-lg border border-input bg-background px-3.5 text-[15px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <form
      onSubmit={guardar}
      className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6 shadow-sm"
    >
      <h2 className="text-[15px] font-bold text-foreground">{a.infoComercial}</h2>
      <div className="flex flex-col gap-2">
        <label htmlFor="agencia-nombre" className="text-[13px] font-semibold text-foreground">
          {a.nombre}
        </label>
        <input
          id="agencia-nombre"
          value={nombreEditado}
          onChange={(evento) => setNombreEditado(evento.target.value)}
          maxLength={120}
          required
          className={`h-[46px] ${claseCampo}`}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="agencia-descripcion" className="text-[13px] font-semibold text-foreground">
          {a.descripcion}
        </label>
        <textarea
          id="agencia-descripcion"
          value={descripcionEditada}
          onChange={(evento) => setDescripcionEditada(evento.target.value)}
          maxLength={1000}
          rows={4}
          className={`py-2.5 ${claseCampo}`}
          placeholder={a.placeholderDescripcion}
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={guardando || !nombreEditado.trim()}
          className="flex h-[46px] cursor-pointer items-center rounded-lg bg-accent px-6 text-sm font-bold text-accent-foreground shadow-sm transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 disabled:opacity-60 motion-reduce:transition-none"
        >
          {guardando ? a.guardando : a.guardar}
        </button>
        {mensaje ? (
          <p
            role={mensaje.tipo === "error" ? "alert" : "status"}
            className={`text-sm ${mensaje.tipo === "error" ? "text-destructive" : "text-success"}`}
          >
            {mensaje.texto}
          </p>
        ) : null}
      </div>
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface AgencyProfileFormProps {
  nombre: string;
  descripcion: string;
}

export function AgencyProfileForm({ nombre, descripcion }: AgencyProfileFormProps) {
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
        throw new Error(
          cuerpo?.error?.details?.[0]?.message ?? cuerpo?.error?.message ?? "No se pudo guardar",
        );
      }
      setMensaje({ tipo: "ok", texto: "Perfil guardado." });
      router.refresh();
    } catch (err) {
      setMensaje({
        tipo: "error",
        texto: err instanceof Error ? err.message : "No se pudo guardar",
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
      <h2 className="text-[15px] font-bold text-foreground">Información comercial</h2>
      <div className="flex flex-col gap-2">
        <label htmlFor="agencia-nombre" className="text-[13px] font-semibold text-foreground">
          Nombre de la agencia
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
          Descripción
        </label>
        <textarea
          id="agencia-descripcion"
          value={descripcionEditada}
          onChange={(evento) => setDescripcionEditada(evento.target.value)}
          maxLength={1000}
          rows={4}
          className={`py-2.5 ${claseCampo}`}
          placeholder="Cuenta en qué se especializa tu agencia."
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={guardando || !nombreEditado.trim()}
          className="flex h-[46px] cursor-pointer items-center rounded-lg bg-accent px-6 text-sm font-bold text-accent-foreground shadow-sm transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 disabled:opacity-60 motion-reduce:transition-none"
        >
          {guardando ? "Guardando…" : "Guardar perfil"}
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

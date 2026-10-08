"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useAdminToast } from "@/components/admin/admin-toast";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { ESTADOS_CLIENTE, type EstadoCliente } from "@/lib/clientes";

interface EstadoClienteSelectProps {
  clienteId: string;
  estado: EstadoCliente;
}

// Cambia la etapa del seguimiento (PATCH /api/v1/admin/clientes/:id) en cuanto se elige otra.
export function EstadoClienteSelect({ clienteId, estado }: EstadoClienteSelectProps) {
  const { t } = useIdioma();
  const textos = t.admin.clientes;
  const router = useRouter();
  const { showToast } = useAdminToast();
  const [actual, setActual] = useState<EstadoCliente>(estado);
  const [guardando, setGuardando] = useState(false);
  const id = useId();

  async function cambiar(siguiente: EstadoCliente) {
    const anterior = actual;
    setActual(siguiente);
    setGuardando(true);
    try {
      const respuesta = await fetch(`/api/v1/admin/clientes/${clienteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: siguiente }),
      });
      if (!respuesta.ok) throw new Error(String(respuesta.status));
      showToast(textos.etapaGuardada);
      router.refresh();
    } catch {
      setActual(anterior);
      showToast(textos.errorGuardar);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold tracking-wide text-text-muted uppercase">
        {textos.etapa}
      </label>
      <select
        id={id}
        value={actual}
        disabled={guardando}
        onChange={(evento) => void cambiar(evento.target.value as EstadoCliente)}
        className="h-10 cursor-pointer rounded-lg border border-input bg-surface px-3 text-sm font-semibold text-text disabled:opacity-60"
      >
        {ESTADOS_CLIENTE.map((opcion) => (
          <option key={opcion} value={opcion}>
            {textos.estados[opcion]}
          </option>
        ))}
      </select>
    </div>
  );
}

"use client";

import { XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { type ChangeEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useAdminToast } from "@/components/admin/admin-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { iniciales } from "@/lib/initials";
import type { BrokerActivo } from "@/server/broker-requests/queries";

interface RevokeFormProps {
  broker: BrokerActivo;
}

const SELECTOR_FOCOSABLES =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Dialog sin Portal y con modal={false}: `broker-approval.spec.ts` (fuera de alcance, sin editar)
// localiza sus elementos con `filaBroker.getByRole(...)`, escopado al <li> de la fila. El modo
// modal por defecto de Radix llama a `hideOthers()`, que marca aria-hidden en cada hermano fuera
// de la cadena de ancestros del Content — incluidos los <p> con el nombre/brokerCode del propio
// <li>, lo que rompe ese locator en cuanto el Dialog abre. `modal={false}` evita `hideOthers()`
// (y también el trapFocus automático), así que el atrapado de foco de la Acceptance #1 se
// reimplementa aquí a mano, sobre el mismo Content.
export function RevokeForm({ broker }: RevokeFormProps) {
  const router = useRouter();
  const { showToast } = useAdminToast();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const contenidoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    contenidoRef.current?.querySelector<HTMLElement>(SELECTOR_FOCOSABLES)?.focus();
  }, [abierto]);

  function alPresionarTecla(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key !== "Tab") return;
    const focosables = Array.from(
      contenidoRef.current?.querySelectorAll<HTMLElement>(SELECTOR_FOCOSABLES) ?? [],
    );
    if (focosables.length === 0) return;
    const primero = focosables[0] as HTMLElement;
    const ultimo = focosables[focosables.length - 1] as HTMLElement;
    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  }

  async function revocar() {
    setEnviando(true);

    const respuesta = await fetch(`/api/v1/admin/brokers/${broker.id}/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo }),
    });

    setEnviando(false);
    if (respuesta.status === 409) {
      showToast("Este usuario ya no es broker.");
      setAbierto(false);
      router.refresh();
      return;
    }
    if (respuesta.ok) {
      showToast("Acceso de broker revocado.");
      setAbierto(false);
      router.refresh();
    }
  }

  function alCambiarMotivo(evento: ChangeEvent<HTMLTextAreaElement>) {
    setMotivo(evento.target.value);
  }

  return (
    <article className="flex items-center gap-5 rounded-2xl border border-border bg-surface p-4 max-md:flex-col max-md:items-start">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-background font-display text-sm font-bold text-text">
        {iniciales(broker.nombre)}
      </span>

      <div className="flex min-w-0 grow flex-col gap-0.5">
        <h3 className="text-sm font-semibold text-text">{broker.nombre}</h3>
        <p className="text-sm text-text-muted">{broker.email}</p>
        {broker.brokerCode ? (
          <span className="w-fit rounded-full bg-muted px-2.5 py-0.5 font-display text-xs font-bold tracking-wide text-primary">
            {broker.brokerCode}
          </span>
        ) : null}
      </div>

      <DialogPrimitive.Root open={abierto} onOpenChange={setAbierto} modal={false}>
        <DialogPrimitive.Trigger asChild>
          <Button type="button" variant="destructive" className="shrink-0">
            Revocar
          </Button>
        </DialogPrimitive.Trigger>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-primary/55 duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content
          ref={contenidoRef}
          onKeyDown={alPresionarTecla}
          className="fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-surface p-6 text-text shadow-sm ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div className="flex flex-col gap-1">
            <DialogPrimitive.Title className="text-lg leading-none font-bold text-text">
              Revocar acceso de broker
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-sm text-text-muted">
              Esta acción es irreversible: el usuario pierde su código de broker y deja de recibir
              nuevos leads atribuidos.
            </DialogPrimitive.Description>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`motivo-revocar-${broker.id}`}>Motivo (obligatorio)</Label>
            <Textarea
              id={`motivo-revocar-${broker.id}`}
              rows={4}
              value={motivo}
              onChange={alCambiarMotivo}
            />
          </div>
          <div className="flex justify-end gap-2.5">
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogPrimitive.Close>
            <Button
              type="button"
              variant="destructive"
              disabled={enviando || motivo.trim().length === 0}
              onClick={revocar}
            >
              Confirmar revocación
            </Button>
          </div>
          <DialogPrimitive.Close asChild>
            <Button variant="ghost" size="icon-sm" className="absolute top-3 right-3">
              <XIcon />
              <span className="sr-only">Cerrar</span>
            </Button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Root>
    </article>
  );
}

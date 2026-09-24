"use client";

import { XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { type ChangeEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface RevokeFormProps {
  usuarioId: string;
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
export function RevokeForm({ usuarioId }: RevokeFormProps) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
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
    setMensaje(null);

    const respuesta = await fetch(`/api/v1/admin/brokers/${usuarioId}/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo }),
    });

    setEnviando(false);
    if (respuesta.status === 409) {
      setMensaje("Este usuario ya no es broker");
      setAbierto(false);
      router.refresh();
      return;
    }
    if (respuesta.ok) {
      setAbierto(false);
      router.refresh();
    }
  }

  function alCambiarMotivo(evento: ChangeEvent<HTMLTextAreaElement>) {
    setMotivo(evento.target.value);
  }

  return (
    <div>
      {mensaje ? (
        <p aria-live="polite" className="text-sm text-destructive">
          {mensaje}
        </p>
      ) : null}
      <DialogPrimitive.Root open={abierto} onOpenChange={setAbierto} modal={false}>
        <DialogPrimitive.Trigger asChild>
          <Button type="button" variant="destructive" size="sm">
            Revocar
          </Button>
        </DialogPrimitive.Trigger>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content
          ref={contenidoRef}
          onKeyDown={alPresionarTecla}
          className="fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div className="flex flex-col gap-2">
            <DialogPrimitive.Title className="text-base leading-none font-medium">
              Revocar acceso de broker
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-sm text-muted-foreground">
              Esta acción es irreversible: el usuario pierde su código de broker y deja de recibir
              nuevos leads atribuidos.
            </DialogPrimitive.Description>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`motivo-revocar-${usuarioId}`}>Motivo (obligatorio)</Label>
            <Textarea
              id={`motivo-revocar-${usuarioId}`}
              value={motivo}
              onChange={alCambiarMotivo}
            />
          </div>
          <div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
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
            <Button variant="ghost" size="icon-sm" className="absolute top-2 right-2">
              <XIcon />
              <span className="sr-only">Cerrar</span>
            </Button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Root>
    </div>
  );
}

"use client";

import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface RejectPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  disabled: boolean;
  onConfirm: (motivo: string) => void;
}

const SELECTOR_FOCOSABLES =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Dialog sin Portal y con modal={false}, igual que revoke-form.tsx: property-review.spec.ts
// escopa sus locators (`tarjeta.getByRole(...)`, `tarjeta.getByLabel(...)`) al <article> de la
// fila. El modo modal por defecto de Radix portaría el contenido a document.body y llamaría
// hideOthers(), rompiendo ese escopado en cuanto el diálogo abre.
export function RejectPropertyDialog({
  open,
  onOpenChange,
  title,
  disabled,
  onConfirm,
}: RejectPropertyDialogProps) {
  const p = useIdioma().t.admin.propiedades;
  const [motivo, setMotivo] = useState("");
  const contenidoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    contenidoRef.current?.querySelector<HTMLElement>(SELECTOR_FOCOSABLES)?.focus();
  }, [open]);

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

  function alCambiar(nuevoAbierto: boolean) {
    if (!nuevoAbierto) setMotivo("");
    onOpenChange(nuevoAbierto);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={alCambiar} modal={false}>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-primary/55 duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
      <DialogPrimitive.Content
        ref={contenidoRef}
        onKeyDown={alPresionarTecla}
        className="fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-surface p-6 text-text shadow-sm ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
      >
        <div className="flex flex-col gap-1">
          <DialogPrimitive.Title className="text-lg leading-none font-bold text-text">
            {p.rechazarTitulo}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-text-muted">
            {title}
          </DialogPrimitive.Description>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reject-reason">{p.motivo}</Label>
          <Textarea
            id="reject-reason"
            rows={4}
            placeholder={p.motivoPlaceholder}
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2.5">
          <DialogPrimitive.Close asChild>
            <Button type="button" variant="outline">
              {p.cancelar}
            </Button>
          </DialogPrimitive.Close>
          <Button
            type="button"
            variant="destructive"
            disabled={disabled || motivo.trim().length === 0}
            onClick={() => onConfirm(motivo)}
          >
            {p.confirmarRechazo}
          </Button>
        </div>
        <DialogPrimitive.Close asChild>
          <Button variant="ghost" size="icon-sm" className="absolute top-3 right-3">
            <XIcon />
            <span className="sr-only">{p.cerrar}</span>
          </Button>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Root>
  );
}

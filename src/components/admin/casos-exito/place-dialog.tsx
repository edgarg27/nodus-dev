"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAdminToast } from "@/components/admin/admin-toast";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type CasoExito, POSICIONES_PORTADA } from "@/lib/casos-exito";
import { mensajeDeErrorApi } from "@/lib/i18n/errores-api";

interface PlaceDialogProps {
  // El caso al que se le cambia el lugar; el modal está abierto mientras haya uno.
  caso: CasoExito | null;
  // Título del caso que ocupa cada lugar de la portada (sin contar `caso`).
  ocupados: Record<number, string>;
  onCerrar: () => void;
}

interface FormularioLugarProps {
  caso: CasoExito;
  ocupados: Record<number, string>;
  onCerrar: () => void;
}

// Contenido aparte para que su estado (la opción elegida) arranque de nuevo con cada caso.
function FormularioLugar({ caso, ocupados, onCerrar }: FormularioLugarProps) {
  const { idioma, t } = useIdioma();
  const c = t.admin.casos;
  const router = useRouter();
  const { showToast } = useAdminToast();
  const [elegido, setElegido] = useState<number | null>(caso.posicion);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      const respuesta = await fetch(`/api/v1/admin/casos-exito/${caso.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posicion: elegido }),
      });
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => null);
        throw new Error(mensajeDeErrorApi(cuerpo, idioma, c.errorGuardar));
      }
      showToast(c.lugarGuardado);
      router.refresh();
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : c.errorGuardar);
    } finally {
      setGuardando(false);
    }
  }

  const opciones: { valor: number | null; texto: string; ocupadoPor?: string }[] = [
    { valor: null, texto: c.fueraDePortada },
    ...POSICIONES_PORTADA.map((lugar) => ({
      valor: lugar,
      texto: c.lugarN(lugar),
      ocupadoPor: ocupados[lugar],
    })),
  ];

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-bold text-text">{c.lugarTitulo}</DialogTitle>
        <DialogDescription>{caso.titulo}</DialogDescription>
      </DialogHeader>

      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">{c.lugar}</legend>
        {opciones.map((opcion) => {
          const ocupado = opcion.ocupadoPor !== undefined;
          const marcado = elegido === opcion.valor;
          return (
            <label
              key={opcion.valor ?? "fuera"}
              className={`flex items-center gap-3 rounded-lg border px-3.5 py-3 text-sm transition-colors ${
                ocupado
                  ? "cursor-not-allowed border-border opacity-60"
                  : marcado
                    ? "cursor-pointer border-accent bg-accent/10"
                    : "cursor-pointer border-border hover:border-ink"
              }`}
            >
              <input
                type="radio"
                name="lugar-portada"
                checked={marcado}
                disabled={ocupado}
                onChange={() => setElegido(opcion.valor)}
                className="size-4 accent-ink"
              />
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold text-text">{opcion.texto}</span>
                {ocupado ? (
                  <span className="truncate text-xs text-text-muted">
                    {c.ocupadoPor(opcion.ocupadoPor as string)}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </fieldset>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            {c.cancelar}
          </Button>
        </DialogClose>
        <Button type="button" disabled={guardando || elegido === caso.posicion} onClick={guardar}>
          {guardando ? c.guardando : c.guardarLugar}
        </Button>
      </DialogFooter>
    </>
  );
}

// Modal para elegir el lugar del caso en la portada (1, 2 o 3) o sacarlo de ella. Los lugares
// ocupados por otro caso salen deshabilitados, con el nombre de quien los ocupa.
export function PlaceDialog({ caso, ocupados, onCerrar }: PlaceDialogProps) {
  return (
    <Dialog open={caso !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent showCloseButton={false}>
        {caso ? (
          <FormularioLugar key={caso.id} caso={caso} ocupados={ocupados} onCerrar={onCerrar} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

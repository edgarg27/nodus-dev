"use client";

import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { type KeyboardEvent, useRef } from "react";
import { useIdioma } from "@/components/i18n/idioma-provider";

interface PhotoLightboxProps {
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
  fotos: { id: string; storageUrl: string }[];
  indice: number;
  onIndiceChange: (indice: number) => void;
  descripcionAlt: string;
}

// Visor de fotos a pantalla completa: flechas (y ← →), deslizar en el celular, contador y
// miniaturas. Radix da el foco atrapado, Esc para cerrar y el bloqueo del scroll de la página.
export function PhotoLightbox({
  abierto,
  onAbiertoChange,
  fotos,
  indice,
  onIndiceChange,
  descripcionAlt,
}: PhotoLightboxProps) {
  const { t } = useIdioma();
  const inicioToque = useRef<number | null>(null);
  const total = fotos.length;
  const actual = fotos[indice] ?? fotos[0];
  const ir = (siguiente: number) => onIndiceChange((siguiente + total) % total);

  function alPresionarTecla(evento: KeyboardEvent<HTMLDivElement>) {
    if (total < 2) return;
    if (evento.key === "ArrowLeft") ir(indice - 1);
    if (evento.key === "ArrowRight") ir(indice + 1);
  }

  const boton =
    "flex size-12 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25";

  return (
    <DialogPrimitive.Root open={abierto} onOpenChange={onAbiertoChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-black/95 data-open:animate-in data-open:fade-in-0" />
        <DialogPrimitive.Content
          onKeyDown={alPresionarTecla}
          aria-describedby={undefined}
          className="fixed inset-0 z-[80] flex flex-col text-white outline-none"
        >
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <DialogPrimitive.Title className="text-sm font-semibold">
              {t.ficha.visor} · {indice + 1}/{total}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close className={boton} aria-label={t.ficha.cerrarVisor}>
              <XIcon className="size-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-20"
            onTouchStart={(evento) => {
              inicioToque.current = evento.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(evento) => {
              const inicio = inicioToque.current;
              const fin = evento.changedTouches[0]?.clientX;
              inicioToque.current = null;
              if (inicio === null || fin === undefined || total < 2) return;
              if (Math.abs(fin - inicio) > 50) ir(fin < inicio ? indice + 1 : indice - 1);
            }}
          >
            {actual ? (
              // biome-ignore lint/performance/noImgElement: foto subida por el oferente, no un asset estático
              <img
                key={actual.id}
                src={actual.storageUrl}
                alt={t.ficha.fotoDe(descripcionAlt, indice + 1, total)}
                className="max-h-full max-w-full rounded-lg object-contain"
              />
            ) : null}
            {total > 1 ? (
              <>
                <button
                  type="button"
                  aria-label={t.ficha.fotoAnterior}
                  onClick={() => ir(indice - 1)}
                  className={`${boton} absolute top-1/2 left-2 -translate-y-1/2 sm:left-6`}
                >
                  <ChevronLeftIcon className="size-6" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={t.ficha.fotoSiguiente}
                  onClick={() => ir(indice + 1)}
                  className={`${boton} absolute top-1/2 right-2 -translate-y-1/2 sm:right-6`}
                >
                  <ChevronRightIcon className="size-6" aria-hidden="true" />
                </button>
              </>
            ) : null}
          </div>

          {total > 1 ? (
            <ul className="flex justify-center gap-2 overflow-x-auto px-4 py-4">
              {fotos.map((foto, i) => (
                <li key={foto.id} className="shrink-0">
                  <button
                    type="button"
                    aria-label={t.ficha.verFoto(i + 1)}
                    aria-current={i === indice ? "true" : undefined}
                    onClick={() => onIndiceChange(i)}
                    className={`block h-14 w-20 cursor-pointer overflow-hidden rounded-md border-2 transition-opacity ${
                      i === indice
                        ? "border-accent"
                        : "border-transparent opacity-50 hover:opacity-100"
                    }`}
                  >
                    {/* biome-ignore lint/performance/noImgElement: miniatura de una foto subida */}
                    <img src={foto.storageUrl} alt="" className="h-full w-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

"use client";

import {
  Building2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ImageIcon,
  StoreIcon,
  WarehouseIcon,
} from "lucide-react";
import { useState } from "react";

const ICONO_POR_TIPO = {
  nave_industrial: WarehouseIcon,
  oficina: Building2Icon,
  local_comercial: StoreIcon,
} as const;

interface PropertyGalleryProps {
  fotos: { id: string; storageUrl: string }[];
  tipo: string;
  descripcionAlt: string;
}

// Galería de la ficha: foto grande con flechas, contador "3/12" y miniaturas.
export function PropertyGallery({ fotos, tipo, descripcionAlt }: PropertyGalleryProps) {
  const [indice, setIndice] = useState(0);
  const Icono = ICONO_POR_TIPO[tipo as keyof typeof ICONO_POR_TIPO] ?? WarehouseIcon;

  if (fotos.length === 0) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-primary/70 to-primary">
        <Icono
          className="size-20 text-primary-foreground/50"
          strokeWidth={1.3}
          aria-hidden="true"
        />
      </div>
    );
  }

  const total = fotos.length;
  const actual = fotos[indice] ?? fotos[0];
  const ir = (siguiente: number) => setIndice((siguiente + total) % total);

  return (
    <section aria-label="Fotos del espacio" className="flex flex-col gap-3">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-primary">
        {actual ? (
          // biome-ignore lint/performance/noImgElement: foto subida por el oferente, no un asset estático
          <img
            src={actual.storageUrl}
            alt={`${descripcionAlt}, foto ${indice + 1} de ${total}`}
            className="h-full w-full object-cover"
          />
        ) : null}
        {total > 1 ? (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={() => ir(indice - 1)}
              className="absolute top-1/2 left-3 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-primary/60 text-primary-foreground backdrop-blur transition-colors hover:bg-primary/80"
            >
              <ChevronLeftIcon className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Foto siguiente"
              onClick={() => ir(indice + 1)}
              className="absolute top-1/2 right-3 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-primary/60 text-primary-foreground backdrop-blur transition-colors hover:bg-primary/80"
            >
              <ChevronRightIcon className="size-5" aria-hidden="true" />
            </button>
          </>
        ) : null}
        <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-primary/70 px-2.5 py-1 text-xs font-semibold text-primary-foreground">
          <ImageIcon className="size-3.5" aria-hidden="true" />
          {indice + 1}/{total}
        </span>
      </div>

      {total > 1 ? (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {fotos.map((foto, i) => (
            <li key={foto.id} className="shrink-0">
              <button
                type="button"
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === indice ? "true" : undefined}
                onClick={() => setIndice(i)}
                className={`block h-16 w-24 cursor-pointer overflow-hidden rounded-lg border-2 transition-opacity ${
                  i === indice ? "border-accent" : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                {/* biome-ignore lint/performance/noImgElement: miniatura de una foto subida */}
                <img src={foto.storageUrl} alt="" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

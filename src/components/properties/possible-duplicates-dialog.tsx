"use client";

import { ExternalLinkIcon } from "lucide-react";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface PosibleDuplicado {
  // null: una propiedad ajena que aún no es pública (solo se sabe la dirección).
  id: string | null;
  titulo: string | null;
  direccion: string;
  ciudad: string;
  fotoUrl: string | null;
  distanciaM: number;
  esMia: boolean;
  publicada: boolean;
}

// Pregunta al servidor si ya hay espacios del mismo tipo a pocos metros. Ante cualquier fallo
// responde lista vacía: el aviso es una ayuda y nunca debe impedir publicar.
export async function buscarPosiblesDuplicados(consulta: {
  lat: number;
  lng: number;
  tipo: string;
  excluir?: string;
}): Promise<PosibleDuplicado[]> {
  try {
    const query = new URLSearchParams({
      lat: String(consulta.lat),
      lng: String(consulta.lng),
      tipo: consulta.tipo,
      ...(consulta.excluir ? { excluir: consulta.excluir } : {}),
    });
    const respuesta = await fetch(`/api/v1/properties/possible-duplicates?${query}`);
    if (!respuesta.ok) return [];
    const cuerpo = await respuesta.json();
    return Array.isArray(cuerpo?.data) ? (cuerpo.data as PosibleDuplicado[]) : [];
  } catch {
    return [];
  }
}

interface PossibleDuplicatesDialogProps {
  parecidos: PosibleDuplicado[];
  onCancelar: () => void;
  onContinuar: () => void;
}

// Aviso antes de enviar: ya hay espacios muy cerca. No bloquea (pueden ser otra oficina del mismo
// edificio): quien publica confirma que el suyo es distinto, y el admin lo verá marcado.
export function PossibleDuplicatesDialog({
  parecidos,
  onCancelar,
  onContinuar,
}: PossibleDuplicatesDialogProps) {
  const f = useIdioma().t.panel.formulario;
  return (
    <Dialog
      open={parecidos.length > 0}
      onOpenChange={(abierto) => {
        if (!abierto) onCancelar();
      }}
    >
      <DialogContent className="gap-5 rounded-2xl border border-border bg-surface p-6 sm:max-w-lg">
        <DialogHeader className="gap-2 pr-6">
          <DialogTitle className="font-display text-xl font-bold text-foreground">
            {f.parecidosTitulo}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            {f.parecidosTexto}
          </DialogDescription>
        </DialogHeader>

        <ul className="flex max-h-72 flex-col gap-2.5 overflow-y-auto">
          {parecidos.map((parecido, i) => (
            <li
              key={parecido.id ?? `sin-id-${i}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-background p-3"
            >
              <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary/80 to-primary">
                {parecido.fotoUrl ? (
                  // biome-ignore lint/performance/noImgElement: foto subida por el propietario
                  <img src={parecido.fotoUrl} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="flex min-w-0 grow flex-col gap-0.5">
                <span className="truncate text-sm font-semibold text-foreground">
                  {parecido.titulo ?? parecido.direccion}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {parecido.titulo ? `${parecido.direccion} · ` : ""}
                  {parecido.ciudad}
                </span>
                <span className="text-xs text-muted-foreground">
                  {f.parecidosDistancia(parecido.distanciaM)}
                  {parecido.esMia
                    ? ` · ${f.parecidosTuya}`
                    : parecido.publicada
                      ? ""
                      : ` · ${f.parecidosEnRevision}`}
                </span>
              </div>
              {parecido.id && parecido.publicada ? (
                <a
                  href={`/espacios/${parecido.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex shrink-0 items-center gap-1 text-xs font-semibold text-foreground hover:text-primary"
                >
                  {f.parecidosVer}
                  <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
                </a>
              ) : null}
            </li>
          ))}
        </ul>

        <DialogFooter className="mx-0 mb-0 gap-2 border-0 bg-transparent p-0">
          <Button
            type="button"
            variant="outline"
            onClick={onCancelar}
            className="h-11 rounded-lg border-input px-5 font-bold"
          >
            {f.parecidosEsElMismo}
          </Button>
          <Button
            type="button"
            onClick={onContinuar}
            className="h-11 rounded-lg bg-accent px-5 font-bold text-accent-foreground hover:bg-accent/90"
          >
            {f.parecidosEsOtro}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

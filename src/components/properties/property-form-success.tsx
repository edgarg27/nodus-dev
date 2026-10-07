"use client";

import { useRouter } from "next/navigation";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { Button } from "@/components/ui/button";

interface PropertyFormSuccessProps {
  onReset: () => void;
}

export function PropertyFormSuccess({ onReset }: PropertyFormSuccessProps) {
  const f = useIdioma().t.panel.formulario;
  const router = useRouter();
  return (
    <div className="mx-auto w-full max-w-[820px] px-4">
      <div className="flex flex-col items-center gap-5 rounded-[20px] border border-border bg-surface px-9 py-14 text-center shadow-sm animate-in fade-in zoom-in-95 duration-300 ease-out motion-reduce:animate-none max-sm:px-6">
        <span className="flex size-[60px] items-center justify-center rounded-full bg-warning/15">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-warning"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </span>
        <div className="flex max-w-[420px] flex-col gap-2.5">
          <h1 className="font-display text-2xl font-bold text-foreground">{f.exitoTitulo}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{f.exitoTexto}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onReset}
            className="h-[46px] rounded-lg border-input px-6 text-sm font-bold text-foreground"
          >
            {f.publicarOtra}
          </Button>
          <Button
            type="button"
            onClick={() => {
              router.push("/propiedades");
              router.refresh();
            }}
            className="h-[46px] rounded-lg bg-accent px-6 text-sm font-bold text-accent-foreground hover:bg-accent/90"
          >
            {f.verMisPropiedades}
          </Button>
        </div>
      </div>
    </div>
  );
}

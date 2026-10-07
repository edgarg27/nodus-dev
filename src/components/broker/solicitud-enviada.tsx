"use client";

import { CheckIcon } from "lucide-react";
import Link from "next/link";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { Button } from "@/components/ui/button";

export function SolicitudEnviada() {
  const t = useIdioma().t.broker;
  return (
    <div className="flex flex-col items-center gap-5 rounded-[20px] border border-border bg-surface px-9 py-14 text-center shadow-sm animate-in fade-in zoom-in-95 duration-300 ease-out motion-reduce:animate-none max-sm:px-6">
      <span className="flex size-[60px] items-center justify-center rounded-full bg-warning/15">
        <CheckIcon className="size-7 text-warning" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <div className="flex max-w-[420px] flex-col gap-2.5">
        <h2 className="font-display text-2xl font-bold text-foreground">{t.enviadaTitulo}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{t.enviadaTexto}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <Button
          asChild
          variant="outline"
          className="h-[46px] rounded-lg border-input px-6 text-sm font-bold text-foreground"
        >
          <Link href="/propiedades">{t.volverPublicaciones}</Link>
        </Button>
        <Button
          asChild
          className="h-[46px] rounded-lg bg-accent px-6 text-sm font-bold text-accent-foreground hover:bg-accent/90"
        >
          <Link href="/">{t.volverInicio}</Link>
        </Button>
      </div>
    </div>
  );
}

import { Building2Icon } from "lucide-react";
import Link from "next/link";
import { type Idioma, textosDe } from "@/lib/i18n";

// Aviso para buscadores: "¿Tienes un espacio? Publícalo". Lleva a /publicar, que convierte la
// cuenta en oferente.
export function PublishCta({ idioma }: { idioma: Idioma }) {
  const p = textosDe(idioma).panel.publicar;
  return (
    <aside className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
        <Building2Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="flex min-w-[220px] flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-bold text-text">{p.ctaTitulo}</span>
        <span className="text-sm text-text-muted">{p.ctaTexto}</span>
      </div>
      <Link
        href="/publicar"
        className="flex h-[42px] items-center rounded-lg bg-accent px-5 text-sm font-bold text-accent-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 motion-reduce:transition-none"
      >
        {p.ctaBoton}
      </Link>
    </aside>
  );
}

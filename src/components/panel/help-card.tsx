import { env } from "@/lib/env";
import { type Idioma, textosDe } from "@/lib/i18n";

// Tarjeta de ayuda del panel. El botón de WhatsApp solo aparece si hay número de soporte
// configurado (NEXT_PUBLIC_SUPPORT_WHATSAPP).
export function HelpCard({ idioma }: { idioma: Idioma }) {
  const i = textosDe(idioma).panel.inicio;
  const whatsapp = env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.replace(/\D/g, "");
  return (
    <section
      aria-labelledby="ayuda-titulo"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm"
    >
      <div className="flex flex-col gap-1.5">
        <h2 id="ayuda-titulo" className="text-[15px] font-bold text-foreground">
          {i.ayudaTitulo}
        </h2>
        <p className="text-sm text-muted-foreground">{i.ayudaTexto}</p>
      </div>
      {whatsapp ? (
        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-[46px] w-fit items-center rounded-lg border border-input px-5 text-sm font-bold text-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:border-primary motion-reduce:transition-none"
        >
          {i.whatsapp}
        </a>
      ) : null}
    </section>
  );
}

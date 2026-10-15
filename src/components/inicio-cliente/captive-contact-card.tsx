import { HeadsetIcon } from "lucide-react";
import Link from "next/link";
import { hrefWhatsappCaptive } from "@/lib/captive-ayuda";
import { type Idioma, textosDe } from "@/lib/i18n";

interface CaptiveContactCardProps {
  noLeidos: number;
  idioma: Idioma;
}

// Contacto con el equipo Captive en la pantalla de inicio del cliente: el chat de la web y, si hay
// número configurado (NEXT_PUBLIC_CAPTIVE_WHATSAPP), WhatsApp con un mensaje ya escrito.
export function CaptiveContactCard({ noLeidos, idioma }: CaptiveContactCardProps) {
  const i = textosDe(idioma).panel.inicioCliente;
  const whatsapp = hrefWhatsappCaptive(i.mensajeWhatsapp);
  return (
    <section
      aria-labelledby="captive-titulo"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <HeadsetIcon className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 id="captive-titulo" className="text-[15px] font-bold text-foreground">
            {i.captiveTitulo}
          </h2>
          <p className="text-sm text-muted-foreground">{i.captiveTexto}</p>
        </div>
      </div>
      <Link
        href="/mensajes/captive"
        className="flex h-[46px] items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-bold text-accent-foreground shadow-sm transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 hover:shadow-md motion-reduce:transition-none"
      >
        {i.abrirChat}
        {noLeidos > 0 ? (
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-bold text-foreground">
            <span aria-hidden="true">{noLeidos}</span>
            <span className="sr-only">{i.sinLeer(noLeidos)}</span>
          </span>
        ) : null}
      </Link>
      {whatsapp ? (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-[46px] items-center justify-center rounded-lg border border-input px-5 text-sm font-bold text-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:border-ink motion-reduce:transition-none"
        >
          {i.whatsapp}
        </a>
      ) : null}
    </section>
  );
}

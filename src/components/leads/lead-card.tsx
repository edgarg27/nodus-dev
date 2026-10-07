import { type Idioma, localeDe, textosDe } from "@/lib/i18n";
import type { LeadOferente } from "@/server/contact-requests/queries";

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  const primeras = [partes[0]?.[0], partes[1]?.[0]].filter(Boolean);
  return primeras.join("").toUpperCase() || "?";
}

interface LeadCardProps {
  lead: LeadOferente;
  idioma: Idioma;
}

export function LeadCard({ lead, idioma }: LeadCardProps) {
  const t = textosDe(idioma).panel.leads;
  const formateadorFecha = new Intl.DateTimeFormat(localeDe(idioma), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const metaPartes = [lead.emailBuscador, lead.telefonoBuscador, undefined]
    .filter((parte): parte is string => Boolean(parte))
    .concat(t.recibido(formateadorFecha.format(lead.createdAt)));

  return (
    <article className="flex animate-in flex-col items-start gap-[18px] rounded-2xl border border-border bg-surface p-5 fade-in slide-in-from-bottom-1 duration-300 ease-out motion-reduce:animate-none sm:flex-row">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted font-display text-sm font-bold text-foreground">
        {iniciales(lead.nombreBuscador)}
      </span>

      <div className="flex min-w-0 grow flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[15px] font-semibold text-foreground">{lead.nombreBuscador}</h3>
          {lead.quiereFinanciamiento ? (
            <span className="rounded-full bg-warning-foreground px-2.5 py-0.5 text-[11px] font-bold text-warning">
              {t.quiereFinanciamiento}
            </span>
          ) : null}
        </div>
        <p className="text-[13px] text-muted-foreground">
          {t.interesadoEn}{" "}
          <strong className="font-semibold text-foreground">{lead.direccionPropiedad}</strong>
        </p>
        <p className="text-xs text-muted-foreground/80">{metaPartes.join(" · ")}</p>
        {lead.mensaje ? (
          <p className="mt-1 rounded-md bg-background px-3 py-2 text-sm whitespace-pre-line text-foreground">
            {lead.mensaje}
          </p>
        ) : null}
      </div>

      <a
        href={`mailto:${lead.emailBuscador}`}
        className="flex h-9 shrink-0 items-center justify-center rounded-lg border border-input px-3.5 text-[12.5px] font-bold whitespace-nowrap text-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:border-primary motion-reduce:transition-none sm:min-w-[170px]"
      >
        {t.responder}
      </a>
    </article>
  );
}

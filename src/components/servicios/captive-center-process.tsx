import { type Idioma, textosDe } from "@/lib/i18n";

// Captive Center: el proceso de principio a fin, en tres etapas numeradas.
export function CaptiveCenterProcess({ idioma }: { idioma: Idioma }) {
  const c = textosDe(idioma).captiveCenter;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex max-w-3xl flex-col gap-2">
        <h3 className="font-display text-xl font-bold text-text">{c.procesoTitulo}</h3>
        <p className="text-sm leading-relaxed text-text-muted">{c.procesoIntro}</p>
      </div>
      <ol className="grid gap-4 lg:grid-cols-3">
        {c.proceso.map((etapa, indice) => (
          <li
            key={etapa.titulo}
            className="flex flex-col gap-3 rounded-xl border border-border bg-background p-5"
          >
            <span className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">
                {indice + 1}
              </span>
              <span className="font-semibold text-text">{etapa.titulo}</span>
            </span>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-text-muted">
              {etapa.puntos.map((punto) => (
                <li key={punto}>{punto}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}

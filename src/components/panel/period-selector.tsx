import Link from "next/link";
import { type Idioma, textosDe } from "@/lib/i18n";
import { PERIODOS_DIAS, type PeriodoDias } from "@/lib/periodos";

interface PeriodSelectorProps {
  actual: PeriodoDias;
  idioma: Idioma;
}

// Selector de periodo con enlaces (no necesita JavaScript): cada uno recarga /panel con ?dias=.
export function PeriodSelector({ actual, idioma }: PeriodSelectorProps) {
  const i = textosDe(idioma).panel.inicio;
  return (
    <nav aria-label={i.periodo} className="flex flex-wrap gap-2">
      {PERIODOS_DIAS.map((dias) => {
        const activo = dias === actual;
        return (
          <Link
            key={dias}
            href={`/panel?dias=${dias}`}
            aria-current={activo ? "page" : undefined}
            className={`flex h-[38px] items-center rounded-full border px-4 text-[13px] font-semibold transition-colors duration-150 ease-out ${
              activo
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-surface text-muted-foreground hover:border-primary hover:text-foreground"
            }`}
          >
            {i.ultimosDias(dias)}
          </Link>
        );
      })}
    </nav>
  );
}

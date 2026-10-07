import { BuildingIcon, SearchIcon, ShieldCheckIcon } from "lucide-react";
import { type Idioma, textosDe } from "@/lib/i18n";

// Íconos en el mismo orden que broker.beneficios del diccionario.
const ICONOS = [ShieldCheckIcon, BuildingIcon, SearchIcon];

export function BrokerIntro({ idioma }: { idioma: Idioma }) {
  const t = textosDe(idioma).broker;
  const perks = t.beneficios.map((texto, indice) => ({
    texto,
    Icono: ICONOS[indice] ?? ShieldCheckIcon,
  }));
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-bold tracking-wide text-warning uppercase">
          {t.etiqueta}
        </span>
        <h1 className="font-display text-[28px] font-bold text-foreground">{t.titulo}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{t.intro}</p>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {perks.map((perk) => (
          <div
            key={perk.texto}
            className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 transition-colors duration-150 ease-out hover:border-accent"
          >
            <span className="flex size-[34px] items-center justify-center rounded-[9px] bg-warning-foreground">
              <perk.Icono className="size-[17px] text-warning" strokeWidth={1.8} />
            </span>
            <span className="text-[13px] font-semibold text-foreground">{perk.texto}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

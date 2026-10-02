import { BuildingIcon, SearchIcon, ShieldCheckIcon } from "lucide-react";
import type { ReactNode } from "react";

const PERKS: Array<{ icon: ReactNode; texto: string }> = [
  {
    icon: <ShieldCheckIcon className="size-[17px] text-warning" strokeWidth={1.8} />,
    texto: "Insignia de broker verificado",
  },
  {
    icon: <BuildingIcon className="size-[17px] text-warning" strokeWidth={1.8} />,
    texto: "Publica a nombre de varios clientes",
  },
  {
    icon: <SearchIcon className="size-[17px] text-warning" strokeWidth={1.8} />,
    texto: "Código de broker único",
  },
];

export function BrokerIntro() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-bold tracking-wide text-warning uppercase">
          Programa de brokers
        </span>
        <h1 className="font-display text-[28px] font-bold text-foreground">
          Solicita ser broker en Nodus
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Si representas propiedades de distintos clientes, conviértete en broker verificado. Un
          administrador revisa cada solicitud; al aprobarla, Nodus te asigna un código de broker
          único.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {PERKS.map((perk) => (
          <div
            key={perk.texto}
            className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 transition-colors duration-150 ease-out hover:border-accent"
          >
            <span className="flex size-[34px] items-center justify-center rounded-[9px] bg-warning-foreground">
              {perk.icon}
            </span>
            <span className="text-[13px] font-semibold text-foreground">{perk.texto}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

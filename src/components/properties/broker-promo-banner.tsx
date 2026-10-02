import { ShieldCheckIcon } from "lucide-react";
import Link from "next/link";

interface BrokerPromoBannerProps {
  isBroker: boolean;
}

export function BrokerPromoBanner({ isBroker }: BrokerPromoBannerProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface px-[22px] py-[18px]">
      <span className="flex size-[42px] shrink-0 items-center justify-center rounded-xl bg-warning-foreground">
        <ShieldCheckIcon className="size-5 text-warning" strokeWidth={1.8} />
      </span>
      <div className="flex min-w-[220px] grow flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">
          {isBroker ? "Eres broker verificado" : "¿Representas propiedades de varios clientes?"}
        </span>
        <span className="text-[13px] text-muted-foreground">
          {isBroker
            ? "Consulta tu código y tu enlace de referido."
            : "Conviértete en broker verificado y publica a nombre de cada uno."}
        </span>
      </div>
      <Link
        href="/broker"
        className="flex h-10 items-center whitespace-nowrap rounded-lg border border-input px-[18px] text-[13px] font-bold text-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:border-primary motion-reduce:transition-none"
      >
        {isBroker ? "Mi código de broker" : "Solicitar ser broker"}
      </Link>
    </div>
  );
}

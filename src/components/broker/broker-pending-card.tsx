import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { type Idioma, textosDe } from "@/lib/i18n";

interface BrokerPendingCardProps {
  mensaje: string;
  idioma: Idioma;
}

export function BrokerPendingCard({ mensaje, idioma }: BrokerPendingCardProps) {
  const textos = textosDe(idioma);
  const t = textos.broker;
  return (
    <div className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface p-9 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out motion-reduce:animate-none max-sm:p-6">
      <Badge variant="secondary" className="w-fit bg-warning-foreground text-warning">
        {t.enRevision}
      </Badge>
      <p className="text-sm text-muted-foreground">{mensaje}</p>
      <Link
        href="/verificacion"
        className="w-fit text-sm font-semibold text-foreground underline-offset-4 hover:underline"
      >
        {textos.verificacion.avisoBoton}
      </Link>
    </div>
  );
}

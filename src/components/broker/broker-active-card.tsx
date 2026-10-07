import { Badge } from "@/components/ui/badge";
import { type Idioma, textosDe } from "@/lib/i18n";

interface BrokerActiveCardProps {
  brokerCode: string;
  enlaceReferido: string;
  idioma: Idioma;
}

export function BrokerActiveCard({ brokerCode, enlaceReferido, idioma }: BrokerActiveCardProps) {
  const t = textosDe(idioma).broker;
  return (
    <div className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface p-9 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out motion-reduce:animate-none max-sm:p-6">
      <Badge variant="secondary" className="w-fit bg-success/10 text-success">
        {t.eresBroker}
      </Badge>
      <p className="text-sm text-foreground">
        {t.tuCodigo} {brokerCode}
      </p>
      <p className="text-sm text-muted-foreground">
        {t.enlaceReferido}{" "}
        <a
          href={enlaceReferido}
          className="font-semibold text-foreground underline underline-offset-4 transition-colors hover:text-accent"
        >
          {enlaceReferido}
        </a>
      </p>
    </div>
  );
}

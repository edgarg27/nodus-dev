import { Badge } from "@/components/ui/badge";

interface BrokerActiveCardProps {
  brokerCode: string;
  enlaceReferido: string;
}

export function BrokerActiveCard({ brokerCode, enlaceReferido }: BrokerActiveCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface p-9 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out motion-reduce:animate-none max-sm:p-6">
      <Badge variant="secondary" className="w-fit bg-success/10 text-success">
        Eres broker afiliado
      </Badge>
      <p className="text-sm text-foreground">Tu código: {brokerCode}</p>
      <p className="text-sm text-muted-foreground">
        Enlace de referido:{" "}
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

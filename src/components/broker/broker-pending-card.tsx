import { Badge } from "@/components/ui/badge";

interface BrokerPendingCardProps {
  mensaje: string;
}

export function BrokerPendingCard({ mensaje }: BrokerPendingCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface p-9 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out motion-reduce:animate-none max-sm:p-6">
      <Badge variant="secondary" className="w-fit bg-warning-foreground text-warning">
        Solicitud en revisión
      </Badge>
      <p className="text-sm text-muted-foreground">{mensaje}</p>
    </div>
  );
}

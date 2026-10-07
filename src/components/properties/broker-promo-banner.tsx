import { ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { useIdioma } from "@/components/i18n/idioma-provider";

interface BrokerPromoBannerProps {
  isBroker: boolean;
}

export function BrokerPromoBanner({ isBroker }: BrokerPromoBannerProps) {
  const t = useIdioma().t.broker;
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface px-[22px] py-[18px]">
      <span className="flex size-[42px] shrink-0 items-center justify-center rounded-xl bg-warning-foreground">
        <ShieldCheckIcon className="size-5 text-warning" strokeWidth={1.8} />
      </span>
      <div className="flex min-w-[220px] grow flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">
          {isBroker ? t.bannerTituloBroker : t.bannerTituloInvitacion}
        </span>
        <span className="text-[13px] text-muted-foreground">
          {isBroker ? t.bannerTextoBroker : t.bannerTextoInvitacion}
        </span>
      </div>
      <Link
        href="/broker"
        className="flex h-10 items-center whitespace-nowrap rounded-lg border border-input px-[18px] text-[13px] font-bold text-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:border-primary motion-reduce:transition-none"
      >
        {isBroker ? t.bannerBotonBroker : t.bannerBotonInvitacion}
      </Link>
    </div>
  );
}

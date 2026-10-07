import Link from "next/link";
import type { ReactNode } from "react";

interface KpiCardProps {
  valor: string;
  etiqueta: ReactNode;
  // Enlace opcional a la pantalla donde se ve el detalle.
  href?: string;
}

export function KpiCard({ valor, etiqueta, href }: KpiCardProps) {
  const contenido = (
    <>
      <span className="font-display text-[28px] leading-none font-bold text-foreground">
        {valor}
      </span>
      <span className="text-sm text-muted-foreground">{etiqueta}</span>
    </>
  );
  const clase = "flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5 shadow-sm";
  return href ? (
    <Link
      href={href}
      className={`${clase} transition-all duration-150 ease-out hover:-translate-y-px hover:border-primary motion-reduce:transition-none`}
    >
      {contenido}
    </Link>
  ) : (
    <div className={clase}>{contenido}</div>
  );
}

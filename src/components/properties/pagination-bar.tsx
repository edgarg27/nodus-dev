import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

interface PaginationBarProps {
  pagina: number;
  porPagina: number;
  total: number;
  // Arma la URL de una página dada (conserva el resto de los parámetros).
  hrefDe: (pagina: number) => string;
}

// Paginación "1-25 de 101" con enlaces anterior/siguiente. Sin JavaScript de cliente.
export function PaginationBar({ pagina, porPagina, total, hrefDe }: PaginationBarProps) {
  if (total === 0) return null;
  const desde = (pagina - 1) * porPagina + 1;
  const hasta = Math.min(pagina * porPagina, total);
  const hayAnterior = pagina > 1;
  const haySiguiente = hasta < total;
  const clase =
    "flex size-9 items-center justify-center rounded-lg border border-input text-foreground transition-colors hover:border-primary";
  const claseOff =
    "flex size-9 items-center justify-center rounded-lg border border-input opacity-40";

  return (
    <nav
      aria-label="Paginación"
      className="flex items-center justify-end gap-3 text-[13px] text-muted-foreground"
    >
      <span>
        {desde}-{hasta} de {total}
      </span>
      {hayAnterior ? (
        <Link href={hrefDe(pagina - 1)} aria-label="Página anterior" className={clase}>
          <ChevronLeftIcon className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span aria-hidden="true" className={claseOff}>
          <ChevronLeftIcon className="size-4" />
        </span>
      )}
      {haySiguiente ? (
        <Link href={hrefDe(pagina + 1)} aria-label="Página siguiente" className={clase}>
          <ChevronRightIcon className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span aria-hidden="true" className={claseOff}>
          <ChevronRightIcon className="size-4" />
        </span>
      )}
    </nav>
  );
}

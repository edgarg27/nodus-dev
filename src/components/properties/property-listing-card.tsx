import { Building2Icon, StoreIcon, WarehouseIcon } from "lucide-react";
import Link from "next/link";
import { type EstadoPublicacion, StatusBadge } from "./status-badge";

export interface PropertyListingData {
  id: string;
  direccion: string;
  tipo: string;
  modalidad: string;
  estado: string;
  ciudad: string;
  estadoPublicacion: EstadoPublicacion;
  motivoRechazo: string | null;
  createdAt: string;
  revisadaEn: string | null;
  fotoUrl: string | null;
}

const ICONO_POR_TIPO = {
  nave_industrial: WarehouseIcon,
  oficina: Building2Icon,
  local_comercial: StoreIcon,
} as const;

const ETIQUETA_MODALIDAD: Record<string, string> = {
  renta: "Renta",
  venta: "Venta",
  desde_cero: "Proyecto desde cero",
};

const ETIQUETA_TIPO: Record<string, string> = {
  nave_industrial: "Nave industrial",
  oficina: "Oficina",
  local_comercial: "Local comercial",
};

const formateadorFecha = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

interface PropertyListingCardProps {
  propiedad: PropertyListingData;
}

export function PropertyListingCard({ propiedad }: PropertyListingCardProps) {
  const Icono = ICONO_POR_TIPO[propiedad.tipo as keyof typeof ICONO_POR_TIPO] ?? WarehouseIcon;
  const etiquetaLugar = [propiedad.ciudad, propiedad.estado].filter(Boolean).join(", ");
  const meta = `${ETIQUETA_MODALIDAD[propiedad.modalidad] ?? propiedad.modalidad} · ${
    ETIQUETA_TIPO[propiedad.tipo] ?? propiedad.tipo
  } · ${etiquetaLugar}`;

  return (
    <article className="flex animate-in flex-col items-start gap-5 rounded-2xl border border-border bg-surface p-5 fade-in slide-in-from-bottom-1 duration-300 ease-out motion-reduce:animate-none sm:flex-row">
      <div className="flex h-[72px] w-24 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-gradient-to-br from-primary/80 to-primary">
        {propiedad.fotoUrl ? (
          // biome-ignore lint/performance/noImgElement: foto subida por el oferente, no un asset estático
          <img src={propiedad.fotoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icono
            className="size-8 text-primary-foreground/60"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="flex min-w-0 grow flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-foreground">{propiedad.direccion}</h3>
          <StatusBadge estado={propiedad.estadoPublicacion} />
        </div>
        <p className="text-[13px] text-muted-foreground">{meta}</p>

        {propiedad.estadoPublicacion === "pendiente" ? (
          <p className="text-xs text-muted-foreground/80">
            Enviada el {formateadorFecha.format(new Date(propiedad.createdAt))} · normalmente toma
            24–48 horas en revisarse
          </p>
        ) : null}

        {propiedad.estadoPublicacion === "publicada" && propiedad.revisadaEn ? (
          <p className="text-xs text-muted-foreground/80">
            Pública desde el {formateadorFecha.format(new Date(propiedad.revisadaEn))}
          </p>
        ) : null}

        {propiedad.estadoPublicacion === "rechazada" && propiedad.motivoRechazo ? (
          <div className="mt-1 flex items-start gap-2 rounded-[10px] bg-destructive/10 px-3 py-2.5">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0 text-destructive"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-[12.5px] leading-relaxed text-destructive">
              <strong>Motivo del administrador:</strong> {propiedad.motivoRechazo}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 gap-2 sm:flex-col md:flex-row">
        {propiedad.estadoPublicacion === "pendiente" ? (
          <span className="text-[13px] font-semibold text-muted-foreground">En revisión</span>
        ) : null}
        {propiedad.estadoPublicacion === "publicada" ? (
          <>
            <Link
              href={`/buscar#listing-${propiedad.id}`}
              className="flex h-9 items-center rounded-lg border border-input px-3.5 text-[13px] font-bold text-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:border-primary motion-reduce:transition-none"
            >
              Ver publicación
            </Link>
            <Link
              href={`/propiedades/${propiedad.id}/editar`}
              className="flex h-9 items-center rounded-lg border border-input px-3.5 text-[13px] font-bold text-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:border-primary motion-reduce:transition-none"
            >
              Editar
            </Link>
          </>
        ) : null}
        {propiedad.estadoPublicacion === "rechazada" ? (
          <Link
            href={`/propiedades/${propiedad.id}/editar`}
            className="flex h-9 items-center rounded-lg bg-accent px-3.5 text-[13px] font-bold whitespace-nowrap text-accent-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 motion-reduce:transition-none"
          >
            Corregir y reenviar
          </Link>
        ) : null}
      </div>
    </article>
  );
}

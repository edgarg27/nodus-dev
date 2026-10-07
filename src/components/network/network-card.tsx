import { Building2Icon, ShieldCheckIcon, StoreIcon, WarehouseIcon } from "lucide-react";
import Link from "next/link";
import {
  ETIQUETA_ESTADO,
  ETIQUETA_MODALIDAD,
  ETIQUETA_TIPO,
  formatearPrecio,
} from "@/lib/property-details";
import type { PropiedadDeLaRed } from "@/server/network/queries";
import { ContactAgentButton } from "./contact-agent-button";

const ICONO_POR_TIPO = {
  nave_industrial: WarehouseIcon,
  oficina: Building2Icon,
  local_comercial: StoreIcon,
} as const;

interface NetworkCardProps {
  propiedad: PropiedadDeLaRed;
  // Las propiedades propias aparecen sin botón de contacto.
  esPropia: boolean;
}

export function NetworkCard({ propiedad, esPropia }: NetworkCardProps) {
  const Icono = ICONO_POR_TIPO[propiedad.tipo as keyof typeof ICONO_POR_TIPO] ?? WarehouseIcon;
  const superficie = propiedad.superficieConstruidaM2 ?? propiedad.superficieTerrenoM2;
  const lugar = [propiedad.ciudad, ETIQUETA_ESTADO[propiedad.estado] ?? propiedad.estado]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="relative flex h-44 items-center justify-center bg-gradient-to-br from-primary/80 to-primary">
        {propiedad.fotoUrl ? (
          // biome-ignore lint/performance/noImgElement: foto subida por el oferente
          <img src={propiedad.fotoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icono
            className="size-10 text-primary-foreground/60"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          {propiedad.exclusiva ? (
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground">
              Exclusiva
            </span>
          ) : null}
          <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold text-foreground">
            {ETIQUETA_MODALIDAD[propiedad.modalidad] ?? propiedad.modalidad}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-wide text-warning uppercase">
            {ETIQUETA_TIPO[propiedad.tipo] ?? propiedad.tipo}
          </span>
          <h3 className="line-clamp-2 text-[15px] font-bold text-foreground">
            {propiedad.titulo ?? propiedad.direccion}
          </h3>
          <p className="line-clamp-1 text-xs text-muted-foreground">{lugar}</p>
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <span className="text-base font-bold text-foreground">
            {formatearPrecio(propiedad, propiedad.modalidad)}
          </span>
          {superficie !== null ? (
            <span className="text-xs text-muted-foreground">
              {superficie.toLocaleString("es-MX")} m²
            </span>
          ) : null}
        </div>

        <div className="rounded-lg bg-success/10 px-3 py-2 text-[13px] text-success">
          {propiedad.comisionPct === null ? (
            "Comisión a convenir"
          ) : (
            <>
              Comisión compartida: <strong>{propiedad.comisionPct}%</strong>
              {propiedad.comisionEstimada !== null ? (
                <>
                  {" "}
                  · tu comisión estimada{" "}
                  <strong>
                    {formatearPrecio(
                      {
                        precio: propiedad.comisionEstimada,
                        moneda: propiedad.moneda,
                        precioUnidad: "total",
                      },
                      "venta",
                    )}
                  </strong>
                </>
              ) : null}
            </>
          )}
        </div>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Publicado por{" "}
          <strong className="font-semibold text-foreground">
            {propiedad.agenciaNombre || "—"}
          </strong>
          {propiedad.esBroker ? (
            <span className="flex items-center gap-1 text-success">
              <ShieldCheckIcon className="size-3.5" aria-hidden="true" />
              Broker verificado
            </span>
          ) : null}
        </p>

        <div className="mt-auto flex flex-col gap-2 pt-1">
          {esPropia ? (
            <span className="text-center text-xs font-semibold text-muted-foreground">
              Tu propiedad
            </span>
          ) : (
            <ContactAgentButton
              propiedadId={propiedad.id}
              agenciaNombre={propiedad.agenciaNombre}
            />
          )}
          <Link
            href={`/espacios/${propiedad.id}`}
            className="text-center text-xs font-semibold text-primary underline-offset-4 hover:underline"
          >
            Ver ficha pública
          </Link>
        </div>
      </div>
    </article>
  );
}

"use client";

import { Building2Icon, CheckIcon, LinkIcon, StoreIcon, WarehouseIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { localeDe } from "@/lib/i18n";
import {
  type CampoOrdenMisPropiedades,
  dividirOrden,
  misPropiedadesAParams,
  type ParamsMisPropiedades,
} from "@/lib/mis-propiedades-params";
import { type EstadoPublicacion, StatusBadge } from "./status-badge";

export interface PropiedadDeTabla {
  id: string;
  titulo: string | null;
  referencia: string | null;
  direccion: string;
  lugar: string;
  tipo: string;
  modalidad: string;
  precio: string;
  estadoPublicacion: EstadoPublicacion;
  motivoRechazo: string | null;
  compartidaEnRed: boolean;
  createdAt: string;
  fotoUrl: string | null;
  impresiones: number;
  visitas: number;
  solicitudes: number;
}

const ICONO_POR_TIPO = {
  nave_industrial: WarehouseIcon,
  oficina: Building2Icon,
  local_comercial: StoreIcon,
} as const;

interface MyListingsTableProps {
  propiedades: PropiedadDeTabla[];
  params: ParamsMisPropiedades;
}

function EncabezadoOrdenable({
  campo,
  etiqueta,
  params,
}: {
  campo: CampoOrdenMisPropiedades;
  etiqueta: string;
  params: ParamsMisPropiedades;
}) {
  const actual = dividirOrden(params.orden);
  const activo = actual.campo === campo;
  // Un clic ordena de mayor a menor; el siguiente invierte la dirección.
  const siguiente = activo && actual.direccion === "desc" ? "asc" : "desc";
  const destino = misPropiedadesAParams({ ...params, orden: `${campo}_${siguiente}`, pagina: 1 });
  return (
    <th
      scope="col"
      aria-sort={activo ? (actual.direccion === "asc" ? "ascending" : "descending") : "none"}
      className="px-3 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
    >
      <Link
        href={`/propiedades?${destino}`}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {etiqueta}
        <span aria-hidden="true" className={activo ? "text-foreground" : "opacity-40"}>
          {activo ? (actual.direccion === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </Link>
    </th>
  );
}

function BotonCopiarEnlace({ id }: { id: string }) {
  const tabla = useIdioma().t.panel.tabla;
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/espacios/${id}`);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      // Sin permiso de portapapeles el botón simplemente no copia.
    }
  }
  return (
    <button
      type="button"
      onClick={copiar}
      aria-label={copiado ? tabla.enlaceCopiado : tabla.copiarEnlace}
      className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-input text-foreground transition-colors hover:border-primary"
    >
      {copiado ? (
        <CheckIcon className="size-4 text-success" aria-hidden="true" />
      ) : (
        <LinkIcon className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}

export function MyListingsTable({ propiedades, params }: MyListingsTableProps) {
  const { idioma, t } = useIdioma();
  const tabla = t.panel.tabla;
  const etiquetas = t.etiquetas as {
    tipo: Record<string, string>;
    modalidad: Record<string, string>;
  };
  const formateadorFecha = new Intl.DateTimeFormat(localeDe(idioma), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const todasMarcadas = propiedades.length > 0 && propiedades.every((p) => seleccion.has(p.id));

  function alternar(id: string) {
    setSeleccion((previa) => {
      const siguiente = new Set(previa);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }

  function alternarTodas() {
    setSeleccion(todasMarcadas ? new Set() : new Set(propiedades.map((p) => p.id)));
  }

  const idsSeleccion = [...seleccion].join(",");

  return (
    <div className="flex flex-col gap-3">
      {seleccion.size > 0 ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm"
        >
          <span className="font-semibold text-foreground">
            {tabla.seleccionadas(seleccion.size)}
          </span>
          <div className="flex gap-2">
            <a
              href={`/api/v1/properties/export?ids=${idsSeleccion}`}
              className="flex h-9 items-center rounded-lg border border-input px-3.5 text-[13px] font-bold text-foreground transition-colors hover:border-primary"
            >
              {tabla.exportarSeleccion}
            </a>
            <button
              type="button"
              onClick={() => setSeleccion(new Set())}
              className="flex h-9 cursor-pointer items-center rounded-lg px-3.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground"
            >
              {tabla.quitarSeleccion}
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead className="border-b border-border bg-background">
            <tr>
              <th scope="col" className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={todasMarcadas}
                  onChange={alternarTodas}
                  aria-label={tabla.seleccionarTodas}
                  className="size-4 cursor-pointer accent-primary"
                />
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {tabla.propiedad}
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {tabla.operacion}
              </th>
              <EncabezadoOrdenable campo="precio" etiqueta={tabla.precio} params={params} />
              <EncabezadoOrdenable
                campo="impresiones"
                etiqueta={tabla.impresiones}
                params={params}
              />
              <EncabezadoOrdenable campo="visitas" etiqueta={tabla.visitas} params={params} />
              <EncabezadoOrdenable
                campo="solicitudes"
                etiqueta={tabla.solicitudes}
                params={params}
              />
              <th
                scope="col"
                className="px-3 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {tabla.estado}
              </th>
              <EncabezadoOrdenable campo="fecha" etiqueta={tabla.fecha} params={params} />
              <th
                scope="col"
                className="px-3 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {tabla.acciones}
              </th>
            </tr>
          </thead>
          <tbody>
            {propiedades.map((propiedad) => {
              const Icono =
                ICONO_POR_TIPO[propiedad.tipo as keyof typeof ICONO_POR_TIPO] ?? WarehouseIcon;
              return (
                <tr key={propiedad.id} className="border-b border-border align-top last:border-0">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={seleccion.has(propiedad.id)}
                      onChange={() => alternar(propiedad.id)}
                      aria-label={tabla.seleccionar(propiedad.titulo ?? propiedad.direccion)}
                      className="size-4 cursor-pointer accent-primary"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex min-w-[260px] items-start gap-3">
                      <div className="flex h-[52px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary/80 to-primary">
                        {propiedad.fotoUrl ? (
                          // biome-ignore lint/performance/noImgElement: foto subida por el oferente
                          <img
                            src={propiedad.fotoUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Icono
                            className="size-6 text-primary-foreground/60"
                            strokeWidth={1.5}
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="line-clamp-2 font-semibold text-foreground">
                          {propiedad.titulo ?? propiedad.direccion}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {propiedad.titulo ? `${propiedad.direccion} · ` : ""}
                          {propiedad.lugar}
                        </span>
                        {propiedad.referencia ? (
                          <span className="text-xs text-muted-foreground">
                            {tabla.referencia(propiedad.referencia)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-foreground">
                    {etiquetas.modalidad[propiedad.modalidad] ?? propiedad.modalidad}
                    <span className="block text-xs text-muted-foreground">
                      {etiquetas.tipo[propiedad.tipo] ?? propiedad.tipo}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap font-semibold text-foreground">
                    {propiedad.precio}
                  </td>
                  <td className="bg-muted/40 px-3 py-3 tabular-nums">{propiedad.impresiones}</td>
                  <td className="bg-muted/40 px-3 py-3 tabular-nums">{propiedad.visitas}</td>
                  <td className="bg-muted/40 px-3 py-3 tabular-nums">{propiedad.solicitudes}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col items-start gap-1.5">
                      <StatusBadge estado={propiedad.estadoPublicacion} />
                      {propiedad.compartidaEnRed ? (
                        <span className="text-xs text-muted-foreground">{tabla.enRed}</span>
                      ) : null}
                      {propiedad.estadoPublicacion === "rechazada" && propiedad.motivoRechazo ? (
                        <span className="max-w-[200px] text-xs text-destructive">
                          {propiedad.motivoRechazo}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                    {formateadorFecha.format(new Date(propiedad.createdAt))}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {propiedad.estadoPublicacion === "publicada" ? (
                        <>
                          <Link
                            href={`/espacios/${propiedad.id}`}
                            className="flex h-9 items-center rounded-lg border border-input px-3 text-[13px] font-bold text-foreground transition-colors hover:border-primary"
                          >
                            {tabla.ver}
                          </Link>
                          <BotonCopiarEnlace id={propiedad.id} />
                        </>
                      ) : null}
                      <Link
                        href={`/propiedades/${propiedad.id}/editar`}
                        className={
                          propiedad.estadoPublicacion === "rechazada"
                            ? "flex h-9 items-center rounded-lg bg-accent px-3 text-[13px] font-bold whitespace-nowrap text-accent-foreground hover:bg-accent/90"
                            : "flex h-9 items-center rounded-lg border border-input px-3 text-[13px] font-bold text-foreground transition-colors hover:border-primary"
                        }
                      >
                        {propiedad.estadoPublicacion === "rechazada"
                          ? t.panel.publicaciones.corregir
                          : t.panel.publicaciones.editar}
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { SlidersHorizontalIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ESTADOS_MX } from "@/lib/estados";
import {
  contarFiltrosActivos,
  ETIQUETAS_ORDEN,
  type FiltrosBusqueda,
  ORDENES_BUSQUEDA,
} from "@/lib/search-params";

const MODALIDADES = [
  { value: "renta", etiqueta: "Renta" },
  { value: "venta", etiqueta: "Venta" },
  { value: "desde_cero", etiqueta: "Proyecto desde cero" },
] as const;

const TIPOS = [
  { value: "nave_industrial", etiqueta: "Nave industrial" },
  { value: "oficina", etiqueta: "Oficina" },
  { value: "local_comercial", etiqueta: "Local comercial" },
] as const;

export type SearchFiltersInitial = FiltrosBusqueda & { orden?: string };

const claseCampo =
  "h-[46px] w-full min-w-0 rounded-lg border border-input bg-background px-3.5 text-sm text-text placeholder:text-muted-foreground";

const OPCIONES_BANOS = [1, 2, 3, 4];
const OPCIONES_ESTACIONAMIENTOS = [1, 2, 5, 10, 20];

function valorInicial(valor: number | undefined): string {
  return valor === undefined ? "" : String(valor);
}

function Rango({
  etiqueta,
  nombreMin,
  nombreMax,
  min,
  max,
}: {
  etiqueta: string;
  nombreMin: string;
  nombreMax: string;
  min: number | undefined;
  max: number | undefined;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="pb-1.5 text-xs font-semibold text-text">{etiqueta}</legend>
      <div className="grid grid-cols-2 gap-2">
        <input
          name={nombreMin}
          inputMode="decimal"
          aria-label={`${etiqueta}: mínimo`}
          placeholder="Mínimo"
          defaultValue={valorInicial(min)}
          className={claseCampo}
        />
        <input
          name={nombreMax}
          inputMode="decimal"
          aria-label={`${etiqueta}: máximo`}
          placeholder="Máximo"
          defaultValue={valorInicial(max)}
          className={claseCampo}
        />
      </div>
    </fieldset>
  );
}

interface SearchFiltersProps {
  initial: SearchFiltersInitial;
}

// Popover anclado en pantallas grandes, hoja inferior a pantalla completa en el resto — un solo
// formulario, sin duplicar los campos por breakpoint.
export function SearchFilters({ initial }: SearchFiltersProps) {
  const [open, setOpen] = useState(false);
  const activos = contarFiltrosActivos(initial);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") setOpen(false);
    }
    function alHacerClicFuera(evento: MouseEvent | TouchEvent) {
      if (window.innerWidth < 1024) return;
      const objetivo = evento.target as Node;
      if (panelRef.current?.contains(objetivo) || triggerRef.current?.contains(objetivo)) return;
      setOpen(false);
    }
    document.addEventListener("keydown", alPresionarTecla);
    document.addEventListener("mousedown", alHacerClicFuera);
    return () => {
      document.removeEventListener("keydown", alPresionarTecla);
      document.removeEventListener("mousedown", alHacerClicFuera);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Filtros"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-[42px] cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-4 text-sm font-semibold text-text transition-transform duration-150 ease-out hover:-translate-y-px motion-reduce:transition-none"
      >
        <SlidersHorizontalIcon className="size-[17px]" strokeWidth={2} aria-hidden="true" />
        <span className="hidden sm:inline">Filtros</span>
        {activos > 0 ? (
          <span className="flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">
            {activos}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default border-none bg-primary/55 p-0 lg:hidden"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Filtros de búsqueda"
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col gap-4 overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-[0_-16px_40px_rgba(11,30,59,0.25)] lg:absolute lg:inset-x-auto lg:top-[calc(100%+10px)] lg:right-0 lg:bottom-auto lg:w-80 lg:rounded-2xl lg:border lg:border-border lg:p-5 lg:shadow-[0_16px_40px_rgba(11,30,59,0.18)]"
          >
            <div className="flex items-center justify-between lg:hidden">
              <span className="font-display text-lg font-bold text-text">Filtros</span>
              <button
                type="button"
                aria-label="Cerrar filtros"
                onClick={() => setOpen(false)}
                className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-background"
              >
                <XIcon className="size-4" strokeWidth={2.2} aria-hidden="true" />
              </button>
            </div>

            <form action="/buscar" method="get" className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="filtro-modalidad" className="text-xs font-semibold text-text">
                  Modalidad
                </label>
                <select
                  id="filtro-modalidad"
                  name="modalidad"
                  defaultValue={initial.modalidad ?? ""}
                  className="h-[46px] rounded-lg border border-input bg-background px-3.5 text-sm text-text"
                >
                  <option value="">Cualquiera</option>
                  {MODALIDADES.map((opcion) => (
                    <option key={opcion.value} value={opcion.value}>
                      {opcion.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="filtro-estado" className="text-xs font-semibold text-text">
                  Estado
                </label>
                <select
                  id="filtro-estado"
                  name="estado"
                  defaultValue={initial.estado ?? ""}
                  className="h-[46px] rounded-lg border border-input bg-background px-3.5 text-sm text-text"
                >
                  <option value="">Cualquiera</option>
                  {ESTADOS_MX.map((opcion) => (
                    <option key={opcion.codigo} value={opcion.codigo}>
                      {opcion.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="filtro-tipo" className="text-xs font-semibold text-text">
                  Tipo de inmueble
                </label>
                <select
                  id="filtro-tipo"
                  name="tipo"
                  defaultValue={initial.tipo ?? ""}
                  className="h-[46px] rounded-lg border border-input bg-background px-3.5 text-sm text-text"
                >
                  <option value="">Cualquiera</option>
                  {TIPOS.map((opcion) => (
                    <option key={opcion.value} value={opcion.value}>
                      {opcion.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="filtro-ciudad" className="text-xs font-semibold text-text">
                  Ubicación
                </label>
                <input
                  id="filtro-ciudad"
                  name="ciudad"
                  type="text"
                  defaultValue={initial.ciudad ?? ""}
                  placeholder="Ciudad o zona"
                  className="h-[46px] rounded-lg border border-input bg-background px-3.5 text-sm text-text placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-text">¿Financiamiento?</span>
                <div className="flex items-center gap-5">
                  <label className="flex items-center gap-2 text-sm text-text">
                    <input
                      type="radio"
                      name="financiamiento"
                      value="true"
                      defaultChecked={initial.financiamiento === "true"}
                      className="accent-primary"
                    />
                    Sí
                  </label>
                  <label className="flex items-center gap-2 text-sm text-text">
                    <input
                      type="radio"
                      name="financiamiento"
                      value="false"
                      defaultChecked={initial.financiamiento === "false"}
                      className="accent-primary"
                    />
                    No
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Rango
                  etiqueta="Precio"
                  nombreMin="precio_min"
                  nombreMax="precio_max"
                  min={initial.precioMin}
                  max={initial.precioMax}
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-text-muted">En renta, por mes.</span>
                  <select
                    name="moneda"
                    aria-label="Moneda del precio"
                    defaultValue={initial.moneda ?? "MXN"}
                    className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm text-text"
                  >
                    <option value="MXN">MXN</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <Rango
                etiqueta="Superficie (m²)"
                nombreMin="m2_min"
                nombreMax="m2_max"
                min={initial.superficieMin}
                max={initial.superficieMax}
              />

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="filtro-banos" className="text-xs font-semibold text-text">
                    Baños
                  </label>
                  <select
                    id="filtro-banos"
                    name="banos"
                    defaultValue={valorInicial(initial.banosMin)}
                    className={claseCampo}
                  >
                    <option value="">Cualquiera</option>
                    {OPCIONES_BANOS.map((n) => (
                      <option key={n} value={n}>
                        {n}+
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="filtro-estacionamientos"
                    className="text-xs font-semibold text-text"
                  >
                    Estacionamientos
                  </label>
                  <select
                    id="filtro-estacionamientos"
                    name="estacionamientos"
                    defaultValue={valorInicial(initial.estacionamientosMin)}
                    className={claseCampo}
                  >
                    <option value="">Cualquiera</option>
                    {OPCIONES_ESTACIONAMIENTOS.map((n) => (
                      <option key={n} value={n}>
                        {n}+
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <details
                className="rounded-xl bg-background px-3.5 py-3"
                open={
                  initial.alturaLibreMin !== undefined ||
                  initial.andenesMin !== undefined ||
                  initial.potenciaKvaMin !== undefined
                }
              >
                <summary className="cursor-pointer text-xs font-semibold text-text">
                  Datos de nave industrial
                </summary>
                <div className="mt-3 flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="filtro-altura" className="text-xs text-text">
                        Altura libre mín. (m)
                      </label>
                      <input
                        id="filtro-altura"
                        name="altura_min"
                        inputMode="decimal"
                        defaultValue={valorInicial(initial.alturaLibreMin)}
                        className={claseCampo}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="filtro-andenes" className="text-xs text-text">
                        Andenes mín.
                      </label>
                      <input
                        id="filtro-andenes"
                        name="andenes"
                        inputMode="numeric"
                        defaultValue={valorInicial(initial.andenesMin)}
                        className={claseCampo}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="filtro-kva" className="text-xs text-text">
                      Carga eléctrica mín. (kVA)
                    </label>
                    <input
                      id="filtro-kva"
                      name="kva_min"
                      inputMode="numeric"
                      defaultValue={valorInicial(initial.potenciaKvaMin)}
                      className={claseCampo}
                    />
                  </div>
                </div>
              </details>

              <div className="flex flex-col gap-1.5 sm:hidden">
                <label htmlFor="filtro-orden" className="text-xs font-semibold text-text">
                  Ordenar por
                </label>
                <select
                  id="filtro-orden"
                  name="orden"
                  defaultValue={initial.orden ?? "relevancia"}
                  className="h-[46px] rounded-lg border border-input bg-background px-3.5 text-sm text-text"
                >
                  {ORDENES_BUSQUEDA.map((opcion) => (
                    <option key={opcion} value={opcion}>
                      {ETIQUETAS_ORDEN[opcion]}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent text-sm font-bold text-accent-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 hover:shadow-md active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                Buscar espacios
              </button>
              {activos > 0 ? (
                <a
                  href="/buscar"
                  className="text-center text-sm font-semibold text-text-muted underline-offset-4 hover:text-text hover:underline"
                >
                  Limpiar filtros
                </a>
              ) : null}
            </form>
          </div>
        </>
      ) : null}
    </div>
  );
}

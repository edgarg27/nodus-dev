"use client";

import { SlidersHorizontalIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { ESTADOS_MX } from "@/lib/estados";
import { contarFiltrosActivos, type FiltrosBusqueda, ORDENES_BUSQUEDA } from "@/lib/search-params";

const MODALIDADES = ["renta", "venta", "desde_cero"] as const;
const TIPOS = ["nave_industrial", "oficina", "local_comercial"] as const;

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
  textoMinimo,
  textoMaximo,
}: {
  etiqueta: string;
  nombreMin: string;
  nombreMax: string;
  min: number | undefined;
  max: number | undefined;
  textoMinimo: string;
  textoMaximo: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="pb-1.5 text-xs font-semibold text-text">{etiqueta}</legend>
      <div className="grid grid-cols-2 gap-2">
        <input
          name={nombreMin}
          inputMode="decimal"
          aria-label={`${etiqueta}: ${textoMinimo}`}
          placeholder={textoMinimo}
          defaultValue={valorInicial(min)}
          className={claseCampo}
        />
        <input
          name={nombreMax}
          inputMode="decimal"
          aria-label={`${etiqueta}: ${textoMaximo}`}
          placeholder={textoMaximo}
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
  const { t } = useIdioma();
  const f = t.filtros;
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
        aria-label={f.filtros}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-[42px] cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-4 text-sm font-semibold text-text transition-transform duration-150 ease-out hover:-translate-y-px motion-reduce:transition-none"
      >
        <SlidersHorizontalIcon className="size-[17px]" strokeWidth={2} aria-hidden="true" />
        <span className="hidden sm:inline">{f.filtros}</span>
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
            aria-label={f.filtrosDeBusqueda}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col gap-4 overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-[0_-16px_40px_rgba(11,30,59,0.25)] lg:absolute lg:inset-x-auto lg:top-[calc(100%+10px)] lg:right-0 lg:bottom-auto lg:w-80 lg:rounded-2xl lg:border lg:border-border lg:p-5 lg:shadow-[0_16px_40px_rgba(11,30,59,0.18)]"
          >
            <div className="flex items-center justify-between lg:hidden">
              <span className="font-display text-lg font-bold text-text">{f.filtros}</span>
              <button
                type="button"
                aria-label={f.cerrar}
                onClick={() => setOpen(false)}
                className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-background"
              >
                <XIcon className="size-4" strokeWidth={2.2} aria-hidden="true" />
              </button>
            </div>

            <form action="/buscar" method="get" className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="filtro-modalidad" className="text-xs font-semibold text-text">
                  {f.modalidad}
                </label>
                <select
                  id="filtro-modalidad"
                  name="modalidad"
                  defaultValue={initial.modalidad ?? ""}
                  className="h-[46px] rounded-lg border border-input bg-background px-3.5 text-sm text-text"
                >
                  <option value="">{f.cualquiera}</option>
                  {MODALIDADES.map((opcion) => (
                    <option key={opcion} value={opcion}>
                      {t.etiquetas.modalidad[opcion]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="filtro-estado" className="text-xs font-semibold text-text">
                  {f.estado}
                </label>
                <select
                  id="filtro-estado"
                  name="estado"
                  defaultValue={initial.estado ?? ""}
                  className="h-[46px] rounded-lg border border-input bg-background px-3.5 text-sm text-text"
                >
                  <option value="">{f.cualquiera}</option>
                  {ESTADOS_MX.map((opcion) => (
                    <option key={opcion.codigo} value={opcion.codigo}>
                      {opcion.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="filtro-tipo" className="text-xs font-semibold text-text">
                  {f.tipo}
                </label>
                <select
                  id="filtro-tipo"
                  name="tipo"
                  defaultValue={initial.tipo ?? ""}
                  className="h-[46px] rounded-lg border border-input bg-background px-3.5 text-sm text-text"
                >
                  <option value="">{f.cualquiera}</option>
                  {TIPOS.map((opcion) => (
                    <option key={opcion} value={opcion}>
                      {t.etiquetas.tipo[opcion]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="filtro-ciudad" className="text-xs font-semibold text-text">
                  {f.ubicacion}
                </label>
                <input
                  id="filtro-ciudad"
                  name="ciudad"
                  type="text"
                  defaultValue={initial.ciudad ?? ""}
                  placeholder={f.ciudadZona}
                  className="h-[46px] rounded-lg border border-input bg-background px-3.5 text-sm text-text placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-text">{f.financiamiento}</span>
                <div className="flex items-center gap-5">
                  <label className="flex items-center gap-2 text-sm text-text">
                    <input
                      type="radio"
                      name="financiamiento"
                      value="true"
                      defaultChecked={initial.financiamiento === "true"}
                      className="accent-primary"
                    />
                    {f.si}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-text">
                    <input
                      type="radio"
                      name="financiamiento"
                      value="false"
                      defaultChecked={initial.financiamiento === "false"}
                      className="accent-primary"
                    />
                    {f.no}
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Rango
                  etiqueta={f.precio}
                  textoMinimo={f.minimo}
                  textoMaximo={f.maximo}
                  nombreMin="precio_min"
                  nombreMax="precio_max"
                  min={initial.precioMin}
                  max={initial.precioMax}
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-text-muted">{f.enRentaPorMes}</span>
                  <select
                    name="moneda"
                    aria-label={f.monedaDelPrecio}
                    defaultValue={initial.moneda ?? "MXN"}
                    className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm text-text"
                  >
                    <option value="MXN">MXN</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <Rango
                etiqueta={f.superficie}
                textoMinimo={f.minimo}
                textoMaximo={f.maximo}
                nombreMin="m2_min"
                nombreMax="m2_max"
                min={initial.superficieMin}
                max={initial.superficieMax}
              />

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="filtro-banos" className="text-xs font-semibold text-text">
                    {f.banos}
                  </label>
                  <select
                    id="filtro-banos"
                    name="banos"
                    defaultValue={valorInicial(initial.banosMin)}
                    className={claseCampo}
                  >
                    <option value="">{f.cualquiera}</option>
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
                    {f.estacionamientos}
                  </label>
                  <select
                    id="filtro-estacionamientos"
                    name="estacionamientos"
                    defaultValue={valorInicial(initial.estacionamientosMin)}
                    className={claseCampo}
                  >
                    <option value="">{f.cualquiera}</option>
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
                  {f.datosNave}
                </summary>
                <div className="mt-3 flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="filtro-altura" className="text-xs text-text">
                        {f.alturaMin}
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
                        {f.andenesMin}
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
                      {f.kvaMin}
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
                  {f.ordenarPor}
                </label>
                <select
                  id="filtro-orden"
                  name="orden"
                  defaultValue={initial.orden ?? "relevancia"}
                  className="h-[46px] rounded-lg border border-input bg-background px-3.5 text-sm text-text"
                >
                  {ORDENES_BUSQUEDA.map((opcion) => (
                    <option key={opcion} value={opcion}>
                      {t.orden[opcion]}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent text-sm font-bold text-accent-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 hover:shadow-md active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                {f.buscarEspacios}
              </button>
              {activos > 0 ? (
                <a
                  href="/buscar"
                  className="text-center text-sm font-semibold text-text-muted underline-offset-4 hover:text-text hover:underline"
                >
                  {f.limpiar}
                </a>
              ) : null}
            </form>
          </div>
        </>
      ) : null}
    </div>
  );
}

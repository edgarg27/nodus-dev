import Link from "next/link";
import { ESTADOS_MX } from "@/lib/estados";
import type { ParamsRed } from "@/lib/red-params";

const selectClase =
  "h-[42px] w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const inputClase = selectClase;

interface NetworkFiltersProps {
  params: ParamsRed;
}

// Filtros de la Red: un formulario GET sin JavaScript de cliente (cada campo es un parámetro de
// /red, igual que en /buscar).
export function NetworkFilters({ params }: NetworkFiltersProps) {
  const { filtros } = params;
  return (
    <form
      action="/red"
      method="get"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
          Tipo
          <select name="tipo" defaultValue={filtros.tipo ?? ""} className={selectClase}>
            <option value="">Todos</option>
            <option value="nave_industrial">Nave industrial</option>
            <option value="oficina">Oficina</option>
            <option value="local_comercial">Local comercial</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
          Operación
          <select name="modalidad" defaultValue={filtros.modalidad ?? ""} className={selectClase}>
            <option value="">Todas</option>
            <option value="renta">Renta</option>
            <option value="venta">Venta</option>
            <option value="desde_cero">Desde cero</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
          Estado
          <select name="estado" defaultValue={filtros.estado ?? ""} className={selectClase}>
            <option value="">Todos</option>
            {ESTADOS_MX.map((estado) => (
              <option key={estado.codigo} value={estado.codigo}>
                {estado.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
          Ciudad
          <input
            name="ciudad"
            defaultValue={filtros.ciudad ?? ""}
            placeholder="Cualquiera"
            className={inputClase}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
          Precio mínimo
          <input
            name="precio_min"
            type="number"
            min={0}
            defaultValue={filtros.precioMin ?? ""}
            className={inputClase}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
          Precio máximo
          <input
            name="precio_max"
            type="number"
            min={0}
            defaultValue={filtros.precioMax ?? ""}
            className={inputClase}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
          Superficie mínima (m²)
          <input
            name="m2_min"
            type="number"
            min={0}
            defaultValue={filtros.superficieMin ?? ""}
            className={inputClase}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
          Ordenar por
          <select name="orden" defaultValue={params.orden} className={selectClase}>
            <option value="recientes">Más recientes</option>
            <option value="precio_asc">Precio: menor a mayor</option>
            <option value="precio_desc">Precio: mayor a menor</option>
            <option value="superficie_desc">Superficie: mayor a menor</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-5 text-sm text-foreground">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              name="exclusiva"
              value="1"
              defaultChecked={params.exclusiva}
              className="size-4 accent-primary"
            />
            Solo exclusivas
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              name="ocultar_propias"
              value="1"
              defaultChecked={params.ocultarPropias}
              className="size-4 accent-primary"
            />
            No mostrar mis propiedades
          </label>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/red"
            className="flex h-[42px] items-center px-3 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Borrar filtros
          </Link>
          <button
            type="submit"
            className="flex h-[42px] cursor-pointer items-center rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Aplicar filtros
          </button>
        </div>
      </div>
    </form>
  );
}

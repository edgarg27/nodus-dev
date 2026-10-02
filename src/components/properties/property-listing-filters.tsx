export type FiltroPublicacion = "todas" | "pendiente" | "publicada" | "rechazada";

interface PropertyListingFiltersProps {
  filtro: FiltroPublicacion;
  onCambiarFiltro: (filtro: FiltroPublicacion) => void;
  conteos: Record<FiltroPublicacion, number>;
}

const OPCIONES: Array<{ valor: FiltroPublicacion; etiqueta: string }> = [
  { valor: "todas", etiqueta: "Todas" },
  { valor: "pendiente", etiqueta: "Pendientes" },
  { valor: "publicada", etiqueta: "Publicadas" },
  { valor: "rechazada", etiqueta: "Rechazadas" },
];

export function PropertyListingFilters({
  filtro,
  onCambiarFiltro,
  conteos,
}: PropertyListingFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {OPCIONES.map((opcion) => {
        const activo = filtro === opcion.valor;
        return (
          <button
            key={opcion.valor}
            type="button"
            aria-pressed={activo}
            onClick={() => onCambiarFiltro(opcion.valor)}
            className={`flex h-[38px] cursor-pointer items-center gap-2 rounded-full border px-4 text-[13px] font-semibold transition-colors duration-150 ease-out ${
              activo
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-surface text-muted-foreground hover:border-primary hover:text-foreground"
            }`}
          >
            {opcion.etiqueta}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                activo
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {conteos[opcion.valor]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

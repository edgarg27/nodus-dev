import type { PuntoMetrica } from "@/server/metrics/queries";

interface ViewsChartProps {
  serie: PuntoMetrica[];
}

const ANCHO = 720;
const ALTO = 240;
const MARGEN = { izquierda: 44, derecha: 12, arriba: 12, abajo: 28 };

// Techo "redondo" del eje vertical (10, 20, 50, 100, 200…) para que las marcas queden limpias.
function techoDelEje(maximo: number): number {
  if (maximo <= 10) return 10;
  const magnitud = 10 ** Math.floor(Math.log10(maximo));
  return Math.ceil(maximo / magnitud) * magnitud;
}

const formatoDia = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" });

function etiquetaDia(dia: string): string {
  return formatoDia.format(new Date(`${dia}T12:00:00`)).replace(".", "");
}

// Gráfica de línea de impresiones y visitas por día. SVG puro (sin librería ni JavaScript de
// cliente) con los tokens de diseño; sin datos muestra un estado vacío.
export function ViewsChart({ serie }: ViewsChartProps) {
  const hayDatos = serie.some((punto) => punto.impresiones > 0 || punto.visitas > 0);
  if (!hayDatos) {
    return (
      <div className="flex h-[240px] items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-5 text-center text-sm text-muted-foreground">
        Aún no hay visualizaciones en este periodo. Aparecerán cuando tus propiedades publicadas
        reciban visitas.
      </div>
    );
  }

  const techo = techoDelEje(Math.max(...serie.flatMap((p) => [p.impresiones, p.visitas])));
  const anchoUtil = ANCHO - MARGEN.izquierda - MARGEN.derecha;
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo;
  const x = (i: number) =>
    MARGEN.izquierda + (serie.length === 1 ? anchoUtil / 2 : (i / (serie.length - 1)) * anchoUtil);
  const y = (valor: number) => MARGEN.arriba + altoUtil - (valor / techo) * altoUtil;
  const linea = (campo: "impresiones" | "visitas") =>
    serie
      .map((punto, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(punto[campo]).toFixed(1)}`)
      .join(" ");
  const area = `${linea("impresiones")} L${x(serie.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const marcasY = [0, 0.25, 0.5, 0.75, 1].map((fraccion) => Math.round(techo * fraccion));
  const marcasX = serie
    .map((punto, i) => ({ punto, i }))
    .filter(({ i }) => i % Math.ceil(serie.length / 6) === 0);
  const totalImpresiones = serie.reduce((suma, punto) => suma + punto.impresiones, 0);
  const totalVisitas = serie.reduce((suma, punto) => suma + punto.visitas, 0);

  return (
    <figure className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        role="img"
        aria-label={`Impresiones y visitas por día: ${totalImpresiones} impresiones y ${totalVisitas} visitas en el periodo`}
        className="h-auto w-full"
      >
        {marcasY.map((valor) => (
          <g key={valor}>
            <line
              x1={MARGEN.izquierda}
              x2={ANCHO - MARGEN.derecha}
              y1={y(valor)}
              y2={y(valor)}
              className="stroke-border"
              strokeWidth="1"
            />
            <text
              x={MARGEN.izquierda - 8}
              y={y(valor) + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[11px]"
            >
              {valor.toLocaleString("es-MX")}
            </text>
          </g>
        ))}
        <path d={area} className="fill-primary/10" />
        <path
          d={linea("impresiones")}
          fill="none"
          className="stroke-primary"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d={linea("visitas")}
          fill="none"
          className="stroke-muted-foreground"
          strokeWidth="2"
          strokeDasharray="5 4"
          strokeLinejoin="round"
        />
        {serie.map((punto, i) => (
          <circle
            key={punto.dia}
            cx={x(i)}
            cy={y(punto.impresiones)}
            r="3"
            className="fill-primary"
          >
            <title>{`${etiquetaDia(punto.dia)}: ${punto.impresiones} impresiones, ${punto.visitas} visitas`}</title>
          </circle>
        ))}
        {marcasX.map(({ punto, i }) => (
          <text
            key={punto.dia}
            x={x(i)}
            y={ALTO - 8}
            textAnchor="middle"
            className="fill-muted-foreground text-[11px]"
          >
            {etiquetaDia(punto.dia)}
          </text>
        ))}
      </svg>
      <figcaption className="flex flex-wrap gap-5 text-[13px] text-muted-foreground">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="h-0.5 w-5 rounded-full bg-primary" />
          Impresiones en listados
        </span>
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-0 w-5 border-t-2 border-dashed border-muted-foreground"
          />
          Visitas a tus propiedades
        </span>
      </figcaption>
    </figure>
  );
}

import { formatearNumeroPropietario } from "@/lib/numero-propietario";

interface OwnerNumberProps {
  numero: number | null | undefined;
  // Estados donde tiene propiedades; se muestran después del número.
  estados?: string[];
  // Texto para lectores de pantalla y al pasar el cursor ("Número de propietario").
  etiqueta: string;
}

// "P-0783 · Aguascalientes": cómo distingue Captive a cada dueño o broker en el panel.
export function OwnerNumber({ numero, estados = [], etiqueta }: OwnerNumberProps) {
  const texto = formatearNumeroPropietario(numero);
  if (!texto) return null;
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
      <span
        title={etiqueta}
        className="rounded-full bg-background px-2 py-0.5 font-display font-bold tracking-wide text-text"
      >
        <span className="sr-only">{etiqueta}: </span>
        {texto}
      </span>
      {estados.length > 0 ? <span>{estados.join(", ")}</span> : null}
    </span>
  );
}

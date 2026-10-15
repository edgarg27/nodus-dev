import { CheckIcon } from "lucide-react";
import { limpiarEquipamiento } from "@/lib/equipamiento";
import { type Idioma, textosDe } from "@/lib/i18n";
import { type DetallesPropiedad, especificaciones } from "@/lib/property-details";

interface PropertyFeaturesProps {
  tipo: string;
  detalles: DetallesPropiedad;
  idioma: Idioma;
}

// Para Captive: todo lo que el propietario capturó del espacio (medidas, datos de nave o local y
// equipamiento), para responderle al cliente sin tener que abrir la ficha pública.
export function PropertyFeatures({ tipo, detalles, idioma }: PropertyFeaturesProps) {
  const t = textosDe(idioma);
  const p = t.admin.propiedades;
  const filas = especificaciones(detalles, tipo, idioma);
  const equipamiento = limpiarEquipamiento(tipo, detalles.equipamiento);

  if (filas.length === 0 && equipamiento.length === 0) {
    return <p className="text-sm text-text-muted">{p.sinEspecificaciones}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {filas.length > 0 ? (
        <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
          {filas.map((fila) => (
            <div key={fila.etiqueta} className="flex justify-between gap-3">
              <dt className="text-text-muted">{fila.etiqueta}</dt>
              <dd className="font-semibold text-text">{fila.valor}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {equipamiento.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {equipamiento.map((clave) => (
            <li
              key={clave}
              className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success"
            >
              <CheckIcon className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
              {t.equipamiento[clave]}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

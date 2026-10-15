import { CheckIcon } from "lucide-react";
import { limpiarEquipamiento } from "@/lib/equipamiento";
import { type Idioma, textosDe } from "@/lib/i18n";

interface PropertyEquipmentProps {
  tipo: string;
  equipamiento: readonly string[];
  idioma: Idioma;
}

// Ficha del espacio: lo que el propietario marcó en "Equipamiento". Sin nada marcado no se muestra.
export function PropertyEquipment({ tipo, equipamiento, idioma }: PropertyEquipmentProps) {
  const t = textosDe(idioma);
  const claves = limpiarEquipamiento(tipo, equipamiento);
  if (claves.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-text">{t.ficha.equipamiento}</h2>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {claves.map((clave) => (
          <li
            key={clave}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text"
          >
            <CheckIcon
              className="size-4 shrink-0 text-success"
              strokeWidth={2.2}
              aria-hidden="true"
            />
            {t.equipamiento[clave]}
          </li>
        ))}
      </ul>
    </section>
  );
}

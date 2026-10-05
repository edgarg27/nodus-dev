"use client";

import { PropertyMap } from "../map/property-map";

interface PropertyDetailMapProps {
  id: string;
  direccion: string;
  lat: number;
  lng: number;
}

// Mapa de la ficha: el mismo de resultados con un solo pin, ya seleccionado.
export function PropertyDetailMap({ id, direccion, lat, lng }: PropertyDetailMapProps) {
  return (
    <div className="h-[320px] w-full overflow-hidden rounded-2xl border border-border">
      <PropertyMap
        propiedades={[{ id, direccion, lat, lng }]}
        selectedId={id}
        onSelect={() => {}}
        mostrarConteo={false}
      />
    </div>
  );
}

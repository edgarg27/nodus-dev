"use client";

import { useState } from "react";
import { PropertyMap } from "../map/property-map";
import { PropertyCard, type PropertyCardData } from "./property-card";

export interface SearchResultProperty extends PropertyCardData {
  lat: number;
  lng: number;
}

interface SearchResultsProps {
  propiedades: SearchResultProperty[];
}

// Contenedor que sincroniza lista y mapa por un `selectedId` compartido — única fuente de
// verdad, sin duplicar estado entre PropertyMap y las tarjetas.
export function SearchResults({ propiedades }: SearchResultsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (propiedades.length === 0) {
    return <p>No encontramos propiedades con esos filtros</p>;
  }

  return (
    <div>
      <PropertyMap propiedades={propiedades} selectedId={selectedId} onSelect={setSelectedId} />
      <ul>
        {propiedades.map((propiedad) => (
          <li key={propiedad.id}>
            <PropertyCard
              propiedad={propiedad}
              selected={propiedad.id === selectedId}
              onSelect={() => setSelectedId(propiedad.id)}
              permitirContacto
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

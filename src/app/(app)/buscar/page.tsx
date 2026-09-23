import { type SearchResultProperty, SearchResults } from "@/components/properties/search-results";
import type { EstadoPublicacion } from "@/components/properties/status-badge";
import { buscarPropiedadesPublicas } from "@/server/properties/queries";

const MODALIDADES = ["renta", "venta", "desde_cero"] as const;
const TIPOS = ["nave_industrial", "oficina", "local_comercial"] as const;
const ESTADOS = ["SLP", "Aguascalientes", "Leon"] as const;

function filtroValido<T extends string>(
  valor: string | undefined,
  permitidos: readonly T[],
): T | undefined {
  return permitidos.includes(valor as T) ? (valor as T) : undefined;
}

interface BuscarPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BuscarPage({ searchParams }: BuscarPageProps) {
  const params = await searchParams;
  const leer = (clave: string) => {
    const valor = params[clave];
    return typeof valor === "string" ? valor : undefined;
  };

  const resultado = await buscarPropiedadesPublicas({
    modalidad: filtroValido(leer("modalidad"), MODALIDADES),
    tipo: filtroValido(leer("tipo"), TIPOS),
    estado: filtroValido(leer("estado"), ESTADOS),
    ciudad: leer("ciudad"),
  });

  const propiedades: SearchResultProperty[] = resultado.data.map((fila) => ({
    id: fila.id,
    direccion: fila.direccion,
    tipo: fila.tipo,
    modalidad: fila.modalidad,
    ciudad: fila.ciudad,
    estadoPublicacion: fila.estadoPublicacion as EstadoPublicacion,
    motivoRechazo: fila.motivoRechazo,
    lat: Number(fila.lat),
    lng: Number(fila.lng),
  }));

  return (
    <main>
      <h1>Buscar propiedades</h1>
      <SearchResults propiedades={propiedades} />
    </main>
  );
}

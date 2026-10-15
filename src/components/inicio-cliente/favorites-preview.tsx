import { HeartIcon } from "lucide-react";
import Link from "next/link";
import { type Idioma, textosDe } from "@/lib/i18n";
import { tituloEspacio } from "@/lib/property-details";

export interface FavoritoResumen {
  id: string;
  tipo: string;
  modalidad: string;
  ciudad: string;
  direccion: string;
  fotoUrl: string | null;
}

interface FavoritesPreviewProps {
  favoritos: FavoritoResumen[];
  idioma: Idioma;
}

// Los favoritos más recientes en la pantalla de inicio del cliente, con enlace a la lista completa.
export function FavoritesPreview({ favoritos, idioma }: FavoritesPreviewProps) {
  const i = textosDe(idioma).panel.inicioCliente;
  return (
    <section aria-labelledby="favoritos-titulo" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="favoritos-titulo" className="text-[15px] font-bold text-foreground">
          {i.favoritosTitulo}
        </h2>
        {favoritos.length > 0 ? (
          <Link href="/favoritos" className="text-sm font-semibold text-ink hover:underline">
            {i.verTodos}
          </Link>
        ) : null}
      </div>
      {favoritos.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-5">
          <HeartIcon className="size-6 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{i.favoritosVacio}</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-3">
          {favoritos.map((favorito) => (
            <li key={favorito.id}>
              <Link
                href={`/espacios/${favorito.id}`}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-150 ease-out hover:-translate-y-px hover:border-ink motion-reduce:transition-none"
              >
                <span className="h-28 bg-gradient-to-br from-primary/70 to-primary">
                  {favorito.fotoUrl ? (
                    // biome-ignore lint/performance/noImgElement: foto subida por el propietario
                    <img src={favorito.fotoUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </span>
                <span className="flex flex-col gap-0.5 p-3">
                  <span className="line-clamp-2 text-sm font-semibold text-foreground">
                    {tituloEspacio(favorito.tipo, favorito.modalidad, favorito.ciudad, idioma)}
                  </span>
                  <span className="truncate text-[13px] text-muted-foreground">
                    {favorito.direccion}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

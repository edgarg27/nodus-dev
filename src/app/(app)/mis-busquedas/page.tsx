import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SavedSearchList } from "@/components/properties/saved-search-list";
import { getUsuarioActual } from "@/server/auth/session";
import { obtenerTextos } from "@/server/i18n";
import { listarBusquedasGuardadas } from "@/server/saved-searches/saved-searches";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await obtenerTextos();
  return { title: t.panel.busquedas.metaTitulo };
}

export default async function MisBusquedasPage() {
  const actor = await getUsuarioActual();
  if (!actor) redirect("/sign-in?next=/mis-busquedas");

  const busquedas = await listarBusquedasGuardadas(actor.id);
  const t = (await obtenerTextos()).t.panel.busquedas;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-text">{t.titulo}</h1>
        <p className="text-sm text-text-muted">{t.descripcion}</p>
      </div>
      <SavedSearchList
        busquedas={busquedas.map((busqueda) => ({
          id: busqueda.id,
          nombre: busqueda.nombre,
          consulta: busqueda.consulta,
          total: busqueda.total,
          nuevos: busqueda.nuevos,
        }))}
      />
    </main>
  );
}

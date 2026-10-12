import type { Metadata } from "next";
import { CasesManager } from "@/components/admin/casos-exito/cases-manager";
import { listarTodosLosCasos } from "@/server/casos-exito/queries";
import { obtenerTextos } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await obtenerTextos();
  return { title: t.admin.casos.metaTitulo };
}

// Casos de éxito de la portada. El layout de /admin ya exige rol admin (404 para cualquier otro).
export default async function AdminCasosExitoPage() {
  const [{ t }, casos] = await Promise.all([obtenerTextos(), listarTodosLosCasos()]);
  const textos = t.admin.casos;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[22px] font-bold text-text">{textos.titulo}</h1>
        <p className="max-w-3xl text-sm text-text-muted">{textos.descripcion}</p>
      </div>
      <CasesManager casos={casos} />
    </div>
  );
}

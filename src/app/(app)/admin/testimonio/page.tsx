import type { Metadata } from "next";
import { TestimonialForm } from "@/components/admin/testimonio/testimonial-form";
import { obtenerTextos } from "@/server/i18n";
import { obtenerTestimonio } from "@/server/testimonio/queries";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await obtenerTextos();
  return { title: t.admin.testimonio.metaTitulo };
}

// Testimonio de la portada. El layout de /admin ya exige rol admin (404 para cualquier otro).
export default async function AdminTestimonioPage() {
  const [{ t }, testimonio] = await Promise.all([obtenerTextos(), obtenerTestimonio()]);
  const textos = t.admin.testimonio;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[22px] font-bold text-text">{textos.titulo}</h1>
        <p className="max-w-3xl text-sm text-text-muted">{textos.descripcion}</p>
      </div>
      <TestimonialForm testimonio={testimonio} />
    </div>
  );
}

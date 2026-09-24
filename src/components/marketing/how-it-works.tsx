import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">Cómo funciona</h2>
      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-medium text-text">Buscar y contactar</h3>
          <ol className="flex flex-col gap-3 text-sm text-text-muted">
            <li>1. Filtra por tipo, modalidad y plaza en el buscador.</li>
            <li>2. Explora el mapa interactivo y compara propiedades.</li>
            <li>3. Contacta directo al oferente desde la ficha de la propiedad.</li>
          </ol>
        </div>
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-medium text-text">Publicar y aprobar</h3>
          <ol className="flex flex-col gap-3 text-sm text-text-muted">
            <li>1. Publica tu nave, oficina o local con fotos y ubicación.</li>
            <li>2. Un admin de Nodus revisa la propiedad antes de publicarla.</li>
            <li>3. Recibe leads de buscadores directo en tu panel.</li>
          </ol>
        </div>
      </div>
      <div className="mt-8">
        <Button asChild>
          <Link href="/sign-up">Crear cuenta</Link>
        </Button>
      </div>
    </section>
  );
}

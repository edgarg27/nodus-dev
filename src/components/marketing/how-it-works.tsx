import { Reveal } from "./reveal";

const PASOS = [
  {
    numero: 1,
    titulo: "Crea tu cuenta",
    descripcion: "Regístrate e indica qué buscas: modalidad, tipo de inmueble y ubicación.",
  },
  {
    numero: 2,
    titulo: "Explora resultados filtrados",
    descripcion:
      "Compara espacios disponibles con fotos, descripción, ubicación y condiciones, todo en un solo lugar.",
  },
  {
    numero: 3,
    titulo: "Contacta al oferente",
    descripcion: "Envía tu solicitud de contacto directo, sin intermediarios, y agenda tu visita.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <Reveal className="flex max-w-xl flex-col gap-3">
        <span className="text-[13px] font-bold tracking-wide text-primary uppercase">
          Cómo funciona
        </span>
        <h2 className="text-[34px] leading-tight font-bold text-foreground">
          Tres pasos para encontrar tu próximo espacio
        </h2>
      </Reveal>

      <div className="mt-12 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {PASOS.map((paso, indice) => (
          <Reveal
            key={paso.numero}
            delayMs={indice * 90}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-7"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary font-display text-[17px] font-bold text-primary-foreground">
              {paso.numero}
            </span>
            <h3 className="text-[19px] font-semibold text-foreground">{paso.titulo}</h3>
            <p className="text-[15px] leading-relaxed text-muted-foreground">{paso.descripcion}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y condiciones — Nodus",
};

export default function TerminosPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-[32px] font-bold text-foreground">Términos y condiciones</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        Este contenido se publicará próximamente. Si tienes dudas sobre el uso de Nodus mientras
        tanto, contáctanos directamente.
      </p>
    </main>
  );
}

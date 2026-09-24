import type { Metadata } from "next";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { SearchCard } from "@/components/marketing/search-card";
import { ValueProposition } from "@/components/marketing/value-proposition";
import { getUsuarioActual } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Nodus — Naves, oficinas y locales en SLP, Aguascalientes y León",
  description:
    "Encuentra o publica naves industriales, oficinas y locales comerciales en San Luis Potosí, Aguascalientes y León. Nodus conecta pymes con oferentes verificados.",
};

export default async function MarketingPage() {
  const actor = await getUsuarioActual();
  const ctaHref = actor ? "/buscar" : "/sign-up";

  return (
    <main>
      <Hero ctaHref={ctaHref} />
      <section className="mx-auto flex max-w-7xl justify-center px-4 py-12 sm:px-6 lg:px-8">
        <SearchCard />
      </section>
      <ValueProposition />
      <HowItWorks />
    </main>
  );
}

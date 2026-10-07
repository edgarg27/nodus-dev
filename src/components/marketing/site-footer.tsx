import Image from "next/image";
import Link from "next/link";
import { type Idioma, textosDe } from "@/lib/i18n";

// Ligas a las páginas por tipo (todas las ciudades), para visitantes y para Google.
const EXPLORAR = [
  { href: "/renta/naves-industriales", tipo: "nave_industrial", modalidad: "renta" },
  { href: "/renta/oficinas", tipo: "oficina", modalidad: "renta" },
  { href: "/renta/locales-comerciales", tipo: "local_comercial", modalidad: "renta" },
  { href: "/venta/naves-industriales", tipo: "nave_industrial", modalidad: "venta" },
];

// Sin idioma (páginas internas en español), usa español.
export function SiteFooter({ idioma = "es" }: { idioma?: Idioma }) {
  const textos = textosDe(idioma);
  const t = textos.footer;
  return (
    <footer className="bg-primary">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-3 lg:grid-cols-4">
          <div className="flex flex-col gap-4 sm:col-span-3 lg:col-span-1">
            <Link
              href="/"
              aria-label="Captive Center by Nodus Flex Center — inicio"
              className="w-fit"
            >
              <Image
                src="/brand/captive-center-logo-oscuro.png"
                alt=""
                width={170}
                height={56}
                className="h-14 w-auto"
              />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-primary-foreground/55">
              {t.descripcion}
            </p>
          </div>
          <div className="flex flex-col gap-3.5">
            <span className="text-[13px] font-bold tracking-wide text-primary-foreground uppercase">
              {t.producto}
            </span>
            <Link
              href="/#buscar"
              className="text-sm text-primary-foreground/70 hover:text-primary-foreground"
            >
              {t.buscarEspacios}
            </Link>
            <Link
              href="/#propietarios"
              className="text-sm text-primary-foreground/70 hover:text-primary-foreground"
            >
              {t.publicar}
            </Link>
            <Link
              href="/#como-funciona"
              className="text-sm text-primary-foreground/70 hover:text-primary-foreground"
            >
              {t.comoFunciona}
            </Link>
          </div>
          <div className="flex flex-col gap-3.5">
            <span className="text-[13px] font-bold tracking-wide text-primary-foreground uppercase">
              {t.explorar}
            </span>
            {EXPLORAR.map((liga) => (
              <Link
                key={liga.href}
                href={liga.href}
                className="text-sm text-primary-foreground/70 hover:text-primary-foreground"
              >
                {textos.landing.titulo(
                  textos.etiquetas.tipoPlural[liga.tipo] ?? liga.tipo,
                  textos.etiquetas.operacion[liga.modalidad] ?? liga.modalidad,
                  null,
                )}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-3.5">
            <span className="text-[13px] font-bold tracking-wide text-primary-foreground uppercase">
              {t.legal}
            </span>
            <Link
              href="/terminos"
              className="text-sm text-primary-foreground/70 hover:text-primary-foreground"
            >
              {t.terminos}
            </Link>
            <Link
              href="/aviso-privacidad"
              className="text-sm text-primary-foreground/70 hover:text-primary-foreground"
            >
              {t.aviso}
            </Link>
          </div>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-primary-foreground/10 pt-6">
          <span className="text-[13px] text-primary-foreground/50">{t.derechos}</span>
          <span className="text-[13px] text-primary-foreground/50">{t.lema}</span>
        </div>
      </div>
    </footer>
  );
}

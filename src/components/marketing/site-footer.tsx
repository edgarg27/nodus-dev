import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-primary">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-3">
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
              Conectamos pymes y empresas emergentes con los espacios industriales, de oficina y
              comerciales que impulsan su crecimiento.
            </p>
          </div>
          <div className="flex flex-col gap-3.5">
            <span className="text-[13px] font-bold tracking-wide text-primary-foreground uppercase">
              Producto
            </span>
            <Link
              href="/#buscar"
              className="text-sm text-primary-foreground/70 hover:text-primary-foreground"
            >
              Buscar espacios
            </Link>
            <Link
              href="/#propietarios"
              className="text-sm text-primary-foreground/70 hover:text-primary-foreground"
            >
              Publicar un espacio
            </Link>
            <Link
              href="/#como-funciona"
              className="text-sm text-primary-foreground/70 hover:text-primary-foreground"
            >
              Cómo funciona
            </Link>
          </div>
          <div className="flex flex-col gap-3.5">
            <span className="text-[13px] font-bold tracking-wide text-primary-foreground uppercase">
              Legal
            </span>
            <Link
              href="/terminos"
              className="text-sm text-primary-foreground/70 hover:text-primary-foreground"
            >
              Términos y condiciones
            </Link>
            <Link
              href="/aviso-privacidad"
              className="text-sm text-primary-foreground/70 hover:text-primary-foreground"
            >
              Aviso de privacidad
            </Link>
          </div>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-primary-foreground/10 pt-6">
          <span className="text-[13px] text-primary-foreground/50">
            © 2026 Nodus. Todos los derechos reservados.
          </span>
          <span className="text-[13px] text-primary-foreground/50">
            Hecho para empresas que están construyendo su próxima etapa.
          </span>
        </div>
      </div>
    </footer>
  );
}

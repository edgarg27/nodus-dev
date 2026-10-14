import Link from "next/link";
import type { ReactNode } from "react";
import { esEnlaceWhatsapp } from "@/lib/captive-ayuda";

interface CaptiveHelpLinkProps {
  // Lo que devuelve `hrefAyudaCaptive`: el WhatsApp de Captive o el chat de la web.
  href: string;
  className: string;
  children: ReactNode;
}

// Enlace de "Escribir a Captive": WhatsApp abre en otra pestaña; el chat navega dentro del sitio.
export function CaptiveHelpLink({ href, className, children }: CaptiveHelpLinkProps) {
  if (esEnlaceWhatsapp(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

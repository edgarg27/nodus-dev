import type { SiteHeaderActor } from "@/components/nav/site-header";
import type { Textos } from "@/lib/i18n";
import {
  BANDEJA_VISIBLE_PARA_PROPIETARIO,
  MENSAJES_VISIBLE_PARA_PROPIETARIO,
} from "@/lib/propietario-visibilidad";

// Enlaces del menú de la cuenta (avatar del encabezado), según el rol.
interface EnlaceNav {
  href: string;
  etiqueta: string;
  // Contador a la derecha del enlace (por ejemplo, mensajes sin leer).
  insignia?: number;
}

export function enlacesPorRol(actor: SiteHeaderActor, t: Textos["header"]): EnlaceNav[] {
  if (actor.rol === "admin") {
    return [{ href: "/admin/propiedades", etiqueta: t.panelAdmin }];
  }
  const guardados = [
    { href: "/favoritos", etiqueta: t.misFavoritos },
    { href: "/mis-busquedas", etiqueta: t.misBusquedas },
  ];
  if (actor.rol === "propietario") {
    return [
      { href: "/panel", etiqueta: t.panel },
      { href: "/buscar", etiqueta: t.buscarEspacios },
      { href: "/propiedades", etiqueta: t.misPropiedades },
      ...(BANDEJA_VISIBLE_PARA_PROPIETARIO
        ? [{ href: "/leads", etiqueta: t.misLeadsBandeja }]
        : []),
      ...(actor.usaRed === false ? [] : [{ href: "/red", etiqueta: t.red }]),
      ...(MENSAJES_VISIBLE_PARA_PROPIETARIO
        ? [{ href: "/mensajes", etiqueta: t.mensajes, insignia: actor.mensajesNoLeidos }]
        : [
            // Sin "Mensajes", el propietario llega directo a su chat con Captive.
            {
              href: "/mensajes/captive",
              etiqueta: t.chatCaptive,
              insignia: actor.mensajesCaptiveNoLeidos,
            },
          ]),
      { href: "/perfil", etiqueta: t.miPerfil },
      ...guardados,
      { href: "/servicios", etiqueta: t.servicios },
    ];
  }
  return [
    { href: "/buscar", etiqueta: t.buscarEspacios },
    { href: "/mensajes", etiqueta: t.mensajes, insignia: actor.mensajesNoLeidos },
    ...guardados,
    { href: "/publicar", etiqueta: t.publicarEspacio },
    { href: "/servicios", etiqueta: t.servicios },
  ];
}

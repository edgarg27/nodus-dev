"use client";

import { createContext, useContext } from "react";
import { type Idioma, type Textos, textosDe } from "@/lib/i18n";

interface ContextoIdioma {
  idioma: Idioma;
  t: Textos;
}

const Contexto = createContext<ContextoIdioma>({ idioma: "es", t: textosDe("es") });

// El layout raíz lee la cookie y pasa el idioma; los Client Components lo toman con useIdioma().
export function IdiomaProvider({
  idioma,
  children,
}: {
  idioma: Idioma;
  children: React.ReactNode;
}) {
  return <Contexto.Provider value={{ idioma, t: textosDe(idioma) }}>{children}</Contexto.Provider>;
}

export function useIdioma(): ContextoIdioma {
  return useContext(Contexto);
}

"use client";

import { AwardIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAdminToast } from "@/components/admin/admin-toast";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { type CasoExito, MAX_CASOS_PORTADA, primerLugarLibre } from "@/lib/casos-exito";
import { mensajeDeErrorApi } from "@/lib/i18n/errores-api";
import { CaseForm } from "./case-form";
import { PlaceDialog } from "./place-dialog";

interface CasesManagerProps {
  casos: CasoExito[];
}

// Sin acentos ni mayúsculas, para que "tecnologia" encuentre "Tecnología".
const normalizar = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function textoBuscable(caso: CasoExito): string {
  return normalizar(
    [caso.sector, caso.titulo, caso.texto, caso.sectorEn, caso.tituloEn, caso.textoEn]
      .filter(Boolean)
      .join(" "),
  );
}

// Lista de casos de éxito con buscador, alta, edición y baja. Los que hoy salen en la portada (los
// que ocupan un lugar, 1 a 3) van resaltados y tienen "Quitar de la portada"; los demás tienen
// "Poner en la portada", que abre un modal para elegir el lugar. `editando` es el id del caso en
// edición, o "nuevo" mientras se captura uno.
export function CasesManager({ casos }: CasesManagerProps) {
  const { idioma, t } = useIdioma();
  const c = t.admin.casos;
  const router = useRouter();
  const { showToast } = useAdminToast();
  const [editando, setEditando] = useState<string | null>(null);
  const [porBorrar, setPorBorrar] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  // Caso al que se le está eligiendo el lugar en el modal (nulo = modal cerrado).
  const [lugarDe, setLugarDe] = useState<CasoExito | null>(null);

  const visibles = useMemo(() => {
    const aguja = normalizar(busqueda.trim());
    return aguja ? casos.filter((caso) => textoBuscable(caso).includes(aguja)) : casos;
  }, [casos, busqueda]);

  // Título del caso que ocupa cada lugar, para marcarlo como ocupado en el formulario.
  function ocupadosSinContar(idIgnorado?: string): Record<number, string> {
    const ocupados: Record<number, string> = {};
    for (const caso of casos) {
      if (caso.posicion !== null && caso.id !== idIgnorado) ocupados[caso.posicion] = caso.titulo;
    }
    return ocupados;
  }

  // Saca el caso de la portada (lo deja guardado, sin lugar).
  async function quitarDePortada(caso: CasoExito) {
    setError(null);
    const respuesta = await fetch(`/api/v1/admin/casos-exito/${caso.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ posicion: null }),
    });
    if (!respuesta.ok) {
      const cuerpo = await respuesta.json().catch(() => null);
      setError(mensajeDeErrorApi(cuerpo, idioma, c.errorGuardar));
      return;
    }
    showToast(c.quitada);
    router.refresh();
  }

  async function borrar(id: string) {
    setError(null);
    const respuesta = await fetch(`/api/v1/admin/casos-exito/${id}`, { method: "DELETE" });
    if (!respuesta.ok) {
      const cuerpo = await respuesta.json().catch(() => null);
      setError(mensajeDeErrorApi(cuerpo, idioma, c.errorBorrar));
      return;
    }
    setPorBorrar(null);
    showToast(c.borrado);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {editando === "nuevo" ? (
        <CaseForm
          ocupados={ocupadosSinContar()}
          primerLibre={primerLugarLibre(casos)}
          onTerminar={() => setEditando(null)}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setEditando("nuevo")}
            className="flex h-[46px] cursor-pointer items-center gap-2 rounded-lg bg-accent px-5 text-sm font-bold text-accent-foreground shadow-sm transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 motion-reduce:transition-none"
          >
            <PlusIcon className="size-4" aria-hidden="true" />
            {c.nuevo}
          </button>
          {casos.length > 0 ? (
            <search className="relative w-full max-w-[380px]">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-text-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                aria-label={c.buscar}
                placeholder={c.buscarPlaceholder}
                className="h-[46px] w-full rounded-lg border border-input bg-background pr-3.5 pl-10 text-[15px] text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </search>
          ) : null}
        </div>
      )}

      {casos.length > 0 ? (
        <p className="max-w-3xl text-[13px] text-text-muted">
          {c.leyendaPortada(MAX_CASOS_PORTADA)}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {casos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center text-text-muted">
          <AwardIcon className="size-8" strokeWidth={1.6} aria-hidden="true" />
          <span className="max-w-md text-sm">{c.vacio}</span>
        </div>
      ) : visibles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center text-sm text-text-muted">
          {c.sinCoincidencias}
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {visibles.map((caso) => {
            const destacado = caso.posicion !== null;
            return (
              <li key={caso.id}>
                {editando === caso.id ? (
                  <CaseForm
                    caso={caso}
                    ocupados={ocupadosSinContar(caso.id)}
                    primerLibre={primerLugarLibre(casos, caso.id)}
                    onTerminar={() => setEditando(null)}
                  />
                ) : (
                  <article
                    className={`flex flex-col gap-4 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center ${
                      destacado ? "border-accent bg-accent/10" : "border-border bg-surface"
                    }`}
                  >
                    <div className="flex h-24 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background text-xs text-text-muted sm:w-36">
                      {caso.fotoUrl ? (
                        // biome-ignore lint/performance/noImgElement: foto subida por el admin
                        <img src={caso.fotoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        c.sinFoto
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold tracking-wide text-warning uppercase">
                          {caso.sector}
                        </span>
                        {caso.posicion !== null ? (
                          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">
                            {c.enPortadaLugar(caso.posicion)}
                          </span>
                        ) : (
                          <span className="rounded-full bg-background px-2 py-0.5 text-xs font-bold text-text-muted">
                            {c.fueraDePortada}
                          </span>
                        )}
                      </div>
                      <h2 className="text-[16px] font-bold text-text">{caso.titulo}</h2>
                      <p className="line-clamp-2 text-sm text-text-muted">{caso.texto}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {porBorrar === caso.id ? (
                        <>
                          <span className="text-[13px] text-text">{c.confirmarBorrar}</span>
                          <button
                            type="button"
                            onClick={() => void borrar(caso.id)}
                            className="flex h-9 cursor-pointer items-center rounded-lg bg-destructive px-3.5 text-[13px] font-bold text-white"
                          >
                            {c.siBorrar}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPorBorrar(null)}
                            className="flex h-9 cursor-pointer items-center px-2 text-[13px] font-semibold text-text-muted hover:text-text"
                          >
                            {c.cancelar}
                          </button>
                        </>
                      ) : (
                        <>
                          {caso.posicion !== null ? (
                            <button
                              type="button"
                              onClick={() => void quitarDePortada(caso)}
                              className="flex h-9 cursor-pointer items-center rounded-lg border border-input px-3.5 text-[13px] font-bold text-text transition-colors hover:border-ink"
                            >
                              {c.quitarDePortada}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setLugarDe(caso)}
                              className="flex h-9 cursor-pointer items-center rounded-lg border border-accent px-3.5 text-[13px] font-bold text-text transition-colors hover:bg-accent/10"
                            >
                              {c.ponerEnPortada}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditando(caso.id)}
                            className="flex h-9 cursor-pointer items-center rounded-lg border border-input px-3.5 text-[13px] font-bold text-text transition-colors hover:border-ink"
                          >
                            {c.editar}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPorBorrar(caso.id)}
                            className="flex h-9 cursor-pointer items-center rounded-lg px-3.5 text-[13px] font-semibold text-destructive hover:underline"
                          >
                            {c.borrar}
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <PlaceDialog
        caso={lugarDe}
        ocupados={ocupadosSinContar(lugarDe?.id)}
        onCerrar={() => setLugarDe(null)}
      />
    </div>
  );
}

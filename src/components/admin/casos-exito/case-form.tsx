"use client";

import { ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useAdminToast } from "@/components/admin/admin-toast";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { type CasoExito, LIMITES_CASO, POSICIONES_PORTADA } from "@/lib/casos-exito";
import { mensajeDeErrorApi } from "@/lib/i18n/errores-api";

interface CaseFormProps {
  // Sin `caso` el formulario crea uno nuevo; con `caso`, lo edita.
  caso?: CasoExito;
  // Título del caso que ocupa cada lugar de la portada (sin contar el que se edita).
  ocupados: Record<number, string>;
  // Primer lugar libre de la portada (para un caso nuevo), o `null` si están los tres ocupados.
  primerLibre: number | null;
  onTerminar: () => void;
}

const claseCampo =
  "w-full rounded-lg border border-input bg-background px-3.5 text-[15px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

async function leerError(respuesta: Response, idioma: "es" | "en", generico: string) {
  const cuerpo = await respuesta.json().catch(() => null);
  return mensajeDeErrorApi(cuerpo, idioma, generico, { detalle: true });
}

export function CaseForm({ caso, ocupados, primerLibre, onTerminar }: CaseFormProps) {
  const { idioma, t } = useIdioma();
  const c = t.admin.casos;
  const router = useRouter();
  const { showToast } = useAdminToast();
  const idBase = useId();
  const [sector, setSector] = useState(caso?.sector ?? "");
  const [titulo, setTitulo] = useState(caso?.titulo ?? "");
  const [texto, setTexto] = useState(caso?.texto ?? "");
  const [sectorEn, setSectorEn] = useState(caso?.sectorEn ?? "");
  const [tituloEn, setTituloEn] = useState(caso?.tituloEn ?? "");
  const [textoEn, setTextoEn] = useState(caso?.textoEn ?? "");
  // Lugar en la portada: "" = fuera. Un caso nuevo arranca en el primer lugar libre.
  const [posicion, setPosicion] = useState(
    caso
      ? caso.posicion === null
        ? ""
        : String(caso.posicion)
      : primerLibre === null
        ? ""
        : String(primerLibre),
  );
  const [archivo, setArchivo] = useState<File | null>(null);
  const [quitarFoto, setQuitarFoto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fotoActual = quitarFoto ? null : (caso?.fotoUrl ?? null);
  const vistaPrevia = archivo ? URL.createObjectURL(archivo) : fotoActual;

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);
    const cuerpo = {
      sector,
      titulo,
      texto,
      sectorEn,
      tituloEn,
      textoEn,
      posicion: posicion ? Number(posicion) : null,
    };
    try {
      const respuesta = await fetch(
        caso ? `/api/v1/admin/casos-exito/${caso.id}` : "/api/v1/admin/casos-exito",
        {
          method: caso ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cuerpo),
        },
      );
      if (!respuesta.ok) throw new Error(await leerError(respuesta, idioma, c.errorGuardar));
      const id: string = (await respuesta.json()).data.id;

      // La foto se sube (o se quita) después de guardar el texto, cuando el caso ya tiene `id`.
      if (archivo) {
        const formulario = new FormData();
        formulario.append("archivo", archivo);
        const foto = await fetch(`/api/v1/admin/casos-exito/${id}/foto`, {
          method: "POST",
          body: formulario,
        });
        if (!foto.ok) throw new Error(await leerError(foto, idioma, c.errorFoto));
      } else if (quitarFoto && caso?.fotoUrl) {
        await fetch(`/api/v1/admin/casos-exito/${id}/foto`, { method: "DELETE" });
      }

      showToast(caso ? c.guardado : c.creado);
      router.refresh();
      onTerminar();
    } catch (err) {
      setError(err instanceof Error ? err.message : c.errorGuardar);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form
      onSubmit={guardar}
      className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6 shadow-sm"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${idBase}-sector`} className="text-[13px] font-semibold text-text">
            {c.sector}
          </label>
          <input
            id={`${idBase}-sector`}
            value={sector}
            onChange={(evento) => setSector(evento.target.value)}
            maxLength={LIMITES_CASO.sector}
            placeholder={c.sectorEjemplo}
            required
            className={`h-[46px] ${claseCampo}`}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${idBase}-titulo`} className="text-[13px] font-semibold text-text">
            {c.campoTitulo}
          </label>
          <input
            id={`${idBase}-titulo`}
            value={titulo}
            onChange={(evento) => setTitulo(evento.target.value)}
            maxLength={LIMITES_CASO.titulo}
            required
            className={`h-[46px] ${claseCampo}`}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={`${idBase}-texto`} className="text-[13px] font-semibold text-text">
          {c.texto}
        </label>
        <textarea
          id={`${idBase}-texto`}
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          maxLength={LIMITES_CASO.texto}
          rows={4}
          required
          className={`py-2.5 ${claseCampo}`}
        />
        <span className="text-xs text-text-muted">
          {texto.length}/{LIMITES_CASO.texto}
        </span>
      </div>

      <details className="rounded-lg border border-border px-4 py-3">
        <summary className="cursor-pointer text-[13px] font-semibold text-text">
          {c.versionIngles}
        </summary>
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-xs text-text-muted">{c.ayudaIngles}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              aria-label={`${c.sector} (EN)`}
              value={sectorEn}
              onChange={(evento) => setSectorEn(evento.target.value)}
              maxLength={LIMITES_CASO.sector}
              placeholder={`${c.sector} (EN)`}
              className={`h-[46px] ${claseCampo}`}
            />
            <input
              aria-label={`${c.campoTitulo} (EN)`}
              value={tituloEn}
              onChange={(evento) => setTituloEn(evento.target.value)}
              maxLength={LIMITES_CASO.titulo}
              placeholder={`${c.campoTitulo} (EN)`}
              className={`h-[46px] ${claseCampo}`}
            />
          </div>
          <textarea
            aria-label={`${c.texto} (EN)`}
            value={textoEn}
            onChange={(evento) => setTextoEn(evento.target.value)}
            maxLength={LIMITES_CASO.texto}
            rows={3}
            placeholder={`${c.texto} (EN)`}
            className={`py-2.5 ${claseCampo}`}
          />
        </div>
      </details>

      <div className="flex flex-col gap-3">
        <span className="text-[13px] font-semibold text-text">{c.foto}</span>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background text-text-muted">
            {vistaPrevia ? (
              // biome-ignore lint/performance/noImgElement: vista previa de la foto elegida
              <img src={vistaPrevia} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="size-7" strokeWidth={1.5} aria-hidden="true" />
            )}
          </div>
          <div className="flex flex-col items-start gap-2">
            <label className="flex h-10 cursor-pointer items-center rounded-lg border border-input px-4 text-[13px] font-bold text-text transition-colors hover:border-ink">
              {vistaPrevia ? c.cambiarFoto : c.elegirFoto}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(evento) => {
                  setArchivo(evento.target.files?.[0] ?? null);
                  setQuitarFoto(false);
                }}
              />
            </label>
            {vistaPrevia ? (
              <button
                type="button"
                onClick={() => {
                  setArchivo(null);
                  setQuitarFoto(true);
                }}
                className="cursor-pointer text-[13px] font-semibold text-destructive underline underline-offset-4"
              >
                {c.quitarFoto}
              </button>
            ) : null}
            <span className="text-xs text-text-muted">{c.ayudaFoto}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={`${idBase}-lugar`} className="text-[13px] font-semibold text-text">
          {c.lugar}
        </label>
        <select
          id={`${idBase}-lugar`}
          value={posicion}
          onChange={(evento) => setPosicion(evento.target.value)}
          className={`h-[46px] sm:max-w-[420px] ${claseCampo}`}
        >
          <option value="">{c.fueraDePortada}</option>
          {POSICIONES_PORTADA.map((lugar) => {
            const ocupadoPor = ocupados[lugar];
            return (
              <option key={lugar} value={String(lugar)} disabled={ocupadoPor !== undefined}>
                {ocupadoPor === undefined
                  ? c.lugarN(lugar)
                  : `${c.lugarN(lugar)} — ${c.ocupadoPor(ocupadoPor)}`}
              </option>
            );
          })}
        </select>
        <span className="text-xs text-text-muted">{c.ayudaLugar}</span>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={guardando || !sector.trim() || !titulo.trim() || !texto.trim()}
          className="flex h-[46px] cursor-pointer items-center rounded-lg bg-accent px-6 text-sm font-bold text-accent-foreground shadow-sm transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 disabled:opacity-60 motion-reduce:transition-none"
        >
          {guardando ? c.guardando : c.guardar}
        </button>
        <button
          type="button"
          onClick={onTerminar}
          className="flex h-[46px] cursor-pointer items-center rounded-lg px-4 text-sm font-semibold text-text-muted hover:text-text"
        >
          {c.cancelar}
        </button>
      </div>
    </form>
  );
}

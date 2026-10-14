"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useAdminToast } from "@/components/admin/admin-toast";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { Button } from "@/components/ui/button";
import { mensajeDeErrorApi } from "@/lib/i18n/errores-api";
import { LIMITES_TESTIMONIO, type Testimonio } from "@/lib/testimonio";

interface TestimonialFormProps {
  // Nulo mientras nadie haya guardado un testimonio.
  testimonio: Testimonio | null;
}

const claseCampo =
  "w-full rounded-lg border border-input bg-background px-3.5 text-[15px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const claseEtiqueta = "text-sm font-semibold text-text";

// Formulario del único testimonio de la portada: la cita, quién la dice y si se muestra.
export function TestimonialForm({ testimonio }: TestimonialFormProps) {
  const { idioma, t } = useIdioma();
  const x = t.admin.testimonio;
  const router = useRouter();
  const { showToast } = useAdminToast();
  const idBase = useId();
  const [cita, setCita] = useState(testimonio?.cita ?? "");
  const [nombre, setNombre] = useState(testimonio?.nombre ?? "");
  const [cargo, setCargo] = useState(testimonio?.cargo ?? "");
  const [citaEn, setCitaEn] = useState(testimonio?.citaEn ?? "");
  const [cargoEn, setCargoEn] = useState(testimonio?.cargoEn ?? "");
  const [visible, setVisible] = useState(testimonio?.visible ?? true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);
    const respuesta = await fetch("/api/v1/admin/testimonio", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cita, nombre, cargo, citaEn, cargoEn, visible }),
    }).catch(() => null);
    setGuardando(false);

    if (!respuesta?.ok) {
      const cuerpo = await respuesta?.json().catch(() => null);
      setError(mensajeDeErrorApi(cuerpo, idioma, x.errorGuardar, { detalle: true }));
      return;
    }
    showToast(visible ? x.guardadoVisible : x.guardadoOculto);
    router.refresh();
  }

  return (
    <form
      onSubmit={guardar}
      className="flex max-w-3xl flex-col gap-5 rounded-2xl border border-border bg-surface p-6 aria-busy:opacity-70"
      aria-busy={guardando}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idBase}-cita`} className={claseEtiqueta}>
          {x.cita}
        </label>
        <textarea
          id={`${idBase}-cita`}
          required
          rows={4}
          maxLength={LIMITES_TESTIMONIO.cita}
          value={cita}
          onChange={(evento) => setCita(evento.target.value)}
          placeholder={x.citaEjemplo}
          className={`${claseCampo} py-2.5`}
        />
        <span className="text-xs text-text-muted">
          {cita.length}/{LIMITES_TESTIMONIO.cita}
        </span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${idBase}-nombre`} className={claseEtiqueta}>
            {x.nombre}
          </label>
          <input
            id={`${idBase}-nombre`}
            required
            maxLength={LIMITES_TESTIMONIO.nombre}
            value={nombre}
            onChange={(evento) => setNombre(evento.target.value)}
            className={`${claseCampo} h-11`}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${idBase}-cargo`} className={claseEtiqueta}>
            {x.cargo}
          </label>
          <input
            id={`${idBase}-cargo`}
            required
            maxLength={LIMITES_TESTIMONIO.cargo}
            value={cargo}
            onChange={(evento) => setCargo(evento.target.value)}
            placeholder={x.cargoEjemplo}
            className={`${claseCampo} h-11`}
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-4 rounded-xl border border-border p-4">
        <legend className="px-1 text-sm font-semibold text-text">{x.versionIngles}</legend>
        <p className="text-xs text-text-muted">{x.ayudaIngles}</p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${idBase}-cita-en`} className={claseEtiqueta}>
            {x.cita}
          </label>
          <textarea
            id={`${idBase}-cita-en`}
            rows={4}
            maxLength={LIMITES_TESTIMONIO.cita}
            value={citaEn}
            onChange={(evento) => setCitaEn(evento.target.value)}
            className={`${claseCampo} py-2.5`}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${idBase}-cargo-en`} className={claseEtiqueta}>
            {x.cargo}
          </label>
          <input
            id={`${idBase}-cargo-en`}
            maxLength={LIMITES_TESTIMONIO.cargo}
            value={cargoEn}
            onChange={(evento) => setCargoEn(evento.target.value)}
            className={`${claseCampo} h-11`}
          />
        </div>
      </fieldset>

      <label className="flex items-start gap-3 text-sm text-text">
        <input
          type="checkbox"
          checked={visible}
          onChange={(evento) => setVisible(evento.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span className="flex flex-col gap-0.5">
          <span className="font-semibold">{x.mostrar}</span>
          <span className="text-xs text-text-muted">{x.ayudaMostrar}</span>
        </span>
      </label>

      {error ? (
        <p aria-live="polite" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={guardando} className="w-fit">
        {guardando ? x.guardando : x.guardar}
      </Button>
    </form>
  );
}

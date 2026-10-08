"use client";

import { CheckIcon, LinkIcon, MessageCircleIcon, PhoneIcon, Share2Icon } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { AgencyAvatar } from "@/components/agency/agency-avatar";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "./favorite-button";
import { useContactarPropiedad } from "./use-contactar-propiedad";

interface PropertyContactPanelProps {
  propiedadId: string;
  precio: string;
  titulo: string;
  favorito: boolean;
  autenticado: boolean;
  tipo: string;
  aceptaFinanciamiento: boolean;
  haySimilares: boolean;
  // Quién publica: tarjeta bajo el contacto con "Ver teléfono".
  anunciante: { nombre: string; logoUrl: string | null; esBroker: boolean } | null;
}

const MAXIMO_MENSAJE = 1000;

// Columna fija de la ficha: precio, mensaje con preguntas rápidas, Contactar (crea el lead con el
// mensaje y revela el teléfono del oferente) y compartir.
export function PropertyContactPanel({
  propiedadId,
  precio,
  titulo,
  favorito,
  autenticado,
  tipo,
  aceptaFinanciamiento,
  haySimilares,
  anunciante,
}: PropertyContactPanelProps) {
  const { t } = useIdioma();
  const { contacto, error, enviando, contactar } = useContactarPropiedad(propiedadId);
  const [copiado, setCopiado] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [quiereFinanciamiento, setQuiereFinanciamiento] = useState(false);
  const idMensaje = useId();
  const preguntas =
    tipo === "nave_industrial"
      ? [...t.ficha.preguntas, ...t.ficha.preguntasNave]
      : t.ficha.preguntas;

  function agregarPregunta(pregunta: string) {
    setMensaje((actual) => {
      if (actual.includes(pregunta)) return actual;
      const siguiente = actual.trim()
        ? `${actual.trim()}
${pregunta}`
        : pregunta;
      return siguiente.slice(0, MAXIMO_MENSAJE);
    });
  }

  async function compartir() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, url });
        return;
      } catch {
        // Cancelado o no disponible: se copia la liga.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sin acceso al portapapeles no hay nada más que hacer.
    }
  }

  function compartirPorWhatsApp() {
    const texto = encodeURIComponent(`${titulo}: ${window.location.href}`);
    window.open(`https://wa.me/?text=${texto}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-[0_16px_40px_-12px_rgba(11,30,61,0.15)]">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold tracking-wide text-text-muted uppercase">
            {t.ficha.precio}
          </span>
          <span className="font-display text-2xl font-bold text-text">{precio}</span>
        </div>

        {contacto ? (
          <div
            role="status"
            className="flex flex-col gap-1.5 rounded-xl bg-background p-4 text-sm text-text"
          >
            {contacto.telefono ? (
              <>
                <span className="font-semibold">{t.contacto.telefonoOferente}</span>
                <a href={`tel:${contacto.telefono}`} className="text-lg font-bold text-primary">
                  {contacto.telefono}
                </a>
                {contacto.whatsappUrl ? (
                  <a
                    href={contacto.whatsappUrl}
                    className="text-primary underline underline-offset-4"
                  >
                    {t.contacto.escribirWhatsApp}
                  </a>
                ) : null}
              </>
            ) : (
              <span>{t.contacto.listo}</span>
            )}
            {contacto.conversacionId ? (
              <Link
                href={`/mensajes/${contacto.conversacionId}`}
                className="mt-1 flex items-center gap-1.5 font-semibold text-primary underline underline-offset-4"
              >
                <MessageCircleIcon className="size-4" aria-hidden="true" />
                {t.contacto.verConversacion}
              </Link>
            ) : null}
            {haySimilares ? (
              <a href="#similares" className="pt-1 text-primary underline underline-offset-4">
                {t.ficha.verSimilares}
              </a>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <label htmlFor={idMensaje} className="text-sm font-semibold text-text">
              {t.ficha.mensajeOferente}{" "}
              <span className="font-normal text-text-muted">{t.ficha.opcional}</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {preguntas.map((pregunta) => (
                <button
                  key={pregunta}
                  type="button"
                  onClick={() => agregarPregunta(pregunta)}
                  aria-pressed={mensaje.includes(pregunta)}
                  className="cursor-pointer rounded-full border border-input bg-background px-2.5 py-1 text-xs font-medium text-text transition-colors hover:border-primary aria-pressed:border-accent aria-pressed:bg-accent/10"
                >
                  {pregunta}
                </button>
              ))}
            </div>
            <textarea
              id={idMensaje}
              value={mensaje}
              onChange={(evento) => setMensaje(evento.target.value.slice(0, MAXIMO_MENSAJE))}
              rows={3}
              placeholder={t.ficha.placeholderMensaje}
              className="resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-text placeholder:text-muted-foreground"
            />
            {aceptaFinanciamiento ? (
              <label className="flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={quiereFinanciamiento}
                  onChange={(evento) => setQuiereFinanciamiento(evento.target.checked)}
                  className="accent-primary"
                />
                {t.ficha.meInteresaFinanciamiento}
              </label>
            ) : null}
          </div>
        )}

        <Button
          type="button"
          disabled={enviando || contacto !== null}
          onClick={() => void contactar({ mensaje, quiereFinanciamiento })}
          className="h-12 rounded-lg bg-accent text-[15px] font-bold text-accent-foreground shadow-sm transition-transform duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 hover:shadow-md disabled:translate-y-0 disabled:opacity-60 motion-reduce:transition-none"
        >
          {contacto
            ? t.contacto.solicitudEnviada
            : enviando
              ? t.contacto.enviando
              : t.ficha.enviarYVer}
        </Button>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <FavoriteButton
          propiedadId={propiedadId}
          inicial={favorito}
          autenticado={autenticado}
          variante="boton"
        />

        <div className="flex gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => void compartir()}
            className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-input bg-background text-sm font-semibold text-text transition-colors hover:border-primary hover:text-primary"
          >
            {copiado ? (
              <>
                <CheckIcon className="size-4" aria-hidden="true" />
                {t.ficha.ligaCopiada}
              </>
            ) : (
              <>
                <Share2Icon className="size-4" aria-hidden="true" />
                {t.ficha.compartir}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={compartirPorWhatsApp}
            aria-label={t.ficha.compartirWhatsApp}
            className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-semibold text-text transition-colors hover:border-primary hover:text-primary"
          >
            <LinkIcon className="size-4" aria-hidden="true" />
            {t.ficha.whatsapp}
          </button>
        </div>
      </div>

      {anunciante?.nombre ? (
        <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-surface p-4">
          <AgencyAvatar
            nombre={anunciante.nombre}
            logoUrl={anunciante.logoUrl}
            className="h-14 w-20 text-lg"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="truncate text-sm font-semibold text-text">{anunciante.nombre}</span>
            {anunciante.esBroker ? (
              <span className="text-xs font-bold text-success">{t.ficha.brokerVerificado}</span>
            ) : null}
            {contacto?.telefono ? (
              <a href={`tel:${contacto.telefono}`} className="text-base font-bold text-primary">
                {contacto.telefono}
              </a>
            ) : contacto ? null : (
              // Ver el teléfono es contactar: crea el lead con el mensaje escrito (o el saludo) y abre
              // el chat, igual que el botón principal.
              <button
                type="button"
                disabled={enviando}
                onClick={() => void contactar({ mensaje, quiereFinanciamiento })}
                className="flex w-fit cursor-pointer items-center gap-1.5 text-sm font-bold text-text underline-offset-4 hover:text-primary hover:underline disabled:opacity-60"
              >
                <PhoneIcon className="size-4" aria-hidden="true" />
                {t.ficha.verTelefono}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

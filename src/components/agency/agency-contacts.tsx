"use client";

import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { mensajeDeErrorApi } from "@/lib/i18n/errores-api";

type TipoContacto = "email" | "telefono" | "whatsapp";

export interface ContactoVista {
  id: string;
  tipo: TipoContacto;
  valor: string;
  propiedadesAsociadas: number;
}

// El título de cada sección sale del diccionario (panel.agencia.tipoContacto).
const SECCIONES: { tipo: TipoContacto; ejemplo: string; tipoInput: string }[] = [
  { tipo: "email", ejemplo: "ventas@miagencia.mx", tipoInput: "email" },
  { tipo: "telefono", ejemplo: "+52 444 123 4567", tipoInput: "tel" },
  { tipo: "whatsapp", ejemplo: "+52 444 123 4567", tipoInput: "tel" },
];

interface AgencyContactsProps {
  contactos: ContactoVista[];
}

function SeccionContactos({
  seccion,
  contactos,
}: {
  seccion: (typeof SECCIONES)[number];
  contactos: ContactoVista[];
}) {
  const { idioma, t } = useIdioma();
  const a = t.panel.agencia;
  const titulo = a.tipoContacto[seccion.tipo];
  const router = useRouter();
  const [valor, setValor] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function agregar(evento: React.FormEvent) {
    evento.preventDefault();
    setOcupado(true);
    setError(null);
    try {
      const respuesta = await fetch("/api/v1/agency/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: seccion.tipo, valor }),
      });
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => null);
        throw new Error(mensajeDeErrorApi(cuerpo, idioma, a.errorAgregar, { detalle: true }));
      }
      setValor("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : a.errorAgregar);
    } finally {
      setOcupado(false);
    }
  }

  async function borrar(id: string) {
    setOcupado(true);
    setError(null);
    try {
      const respuesta = await fetch(`/api/v1/agency/contacts/${id}`, { method: "DELETE" });
      if (!respuesta.ok) throw new Error(a.errorBorrar);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : a.errorBorrar);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-background">
            <tr>
              <th
                scope="col"
                className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {titulo}
              </th>
              <th
                scope="col"
                className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {a.propiedadesAsociadas}
              </th>
              <th scope="col" className="w-12 px-4 py-2.5">
                <span className="sr-only">{a.acciones}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {contactos.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-muted-foreground">
                  {a.sinContactos(titulo)}
                </td>
              </tr>
            ) : (
              contactos.map((contacto) => (
                <tr key={contacto.id} className="border-t border-border">
                  <td className="px-4 py-3 text-foreground">{contacto.valor}</td>
                  <td className="px-4 py-3 tabular-nums text-foreground">
                    {contacto.propiedadesAsociadas}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => void borrar(contacto.id)}
                      aria-label={a.borrarAria(contacto.valor)}
                      className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2Icon className="size-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <form onSubmit={agregar} className="flex flex-wrap items-center gap-2">
        <label htmlFor={`nuevo-${seccion.tipo}`} className="sr-only">
          {a.agregarAria(titulo)}
        </label>
        <input
          id={`nuevo-${seccion.tipo}`}
          type={seccion.tipoInput}
          value={valor}
          onChange={(evento) => setValor(evento.target.value)}
          placeholder={seccion.ejemplo}
          maxLength={200}
          required
          className="h-10 min-w-[220px] flex-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <button
          type="submit"
          disabled={ocupado || !valor.trim()}
          className="flex h-10 cursor-pointer items-center rounded-lg border border-input px-4 text-[13px] font-bold text-foreground transition-colors hover:border-primary disabled:opacity-60"
        >
          {a.agregar}
        </button>
      </form>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export function AgencyContacts({ contactos }: AgencyContactsProps) {
  const a = useIdioma().t.panel.agencia;
  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-[15px] font-bold text-foreground">{a.contactoTitulo}</h2>
        <p className="text-sm text-muted-foreground">{a.contactoTexto}</p>
      </div>
      {SECCIONES.map((seccion) => (
        <SeccionContactos
          key={seccion.tipo}
          seccion={seccion}
          contactos={contactos.filter((contacto) => contacto.tipo === seccion.tipo)}
        />
      ))}
    </div>
  );
}

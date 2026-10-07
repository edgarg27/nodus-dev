"use client";

import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type TipoContacto = "email" | "telefono" | "whatsapp";

export interface ContactoVista {
  id: string;
  tipo: TipoContacto;
  valor: string;
  propiedadesAsociadas: number;
}

const SECCIONES: { tipo: TipoContacto; titulo: string; ejemplo: string; tipoInput: string }[] = [
  { tipo: "email", titulo: "Correo", ejemplo: "ventas@miagencia.mx", tipoInput: "email" },
  { tipo: "telefono", titulo: "Teléfono", ejemplo: "+52 444 123 4567", tipoInput: "tel" },
  { tipo: "whatsapp", titulo: "WhatsApp", ejemplo: "+52 444 123 4567", tipoInput: "tel" },
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
        throw new Error(cuerpo?.error?.details?.[0]?.message ?? "No se pudo agregar el contacto");
      }
      setValor("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar el contacto");
    } finally {
      setOcupado(false);
    }
  }

  async function borrar(id: string) {
    setOcupado(true);
    setError(null);
    try {
      const respuesta = await fetch(`/api/v1/agency/contacts/${id}`, { method: "DELETE" });
      if (!respuesta.ok) throw new Error("No se pudo borrar el contacto");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo borrar el contacto");
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
                {seccion.titulo}
              </th>
              <th
                scope="col"
                className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                Propiedades asociadas
              </th>
              <th scope="col" className="w-12 px-4 py-2.5">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {contactos.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-muted-foreground">
                  Aún no agregas {seccion.titulo.toLowerCase()}.
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
                      aria-label={`Borrar ${contacto.valor}`}
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
          Agregar {seccion.titulo.toLowerCase()}
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
          Agregar
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
  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-[15px] font-bold text-foreground">Datos de contacto</h2>
        <p className="text-sm text-muted-foreground">
          Al publicar o editar una propiedad eliges cuál de estos contactos se muestra en ella.
        </p>
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

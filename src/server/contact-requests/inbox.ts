import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { contactRequest, conversacion, propiedad, usuario } from "../../lib/db/schema.ts";
import { ESTADOS_LEAD, type EstadoLead, POR_PAGINA_LEADS } from "../../lib/leads.ts";
import { obtenerPrimerasFotos } from "../properties/queries.ts";

export interface PropiedadDeLead {
  id: string;
  titulo: string | null;
  direccion: string;
  tipo: string;
  modalidad: string;
  solicitudes: number;
  fotoUrl: string | null;
}

// Un buscador con todo lo que le pidió a este oferente. `estado` es el de su solicitud más
// reciente: cambiarlo actualiza todas sus solicitudes, y una solicitud nueva vuelve a "nueva".
export interface PersonaLead {
  buscadorId: string;
  nombre: string;
  email: string;
  telefono: string | null;
  estado: EstadoLead;
  solicitudes: number;
  ultimaFecha: Date;
  quiereFinanciamiento: boolean;
  ultimoMensaje: string | null;
  // Chat con esta persona sobre su propiedad más reciente, para responderle ahí mismo.
  conversacionId: string | null;
  propiedades: PropiedadDeLead[];
}

export interface BandejaLeads {
  personas: PersonaLead[];
  // Personas que cumplen la búsqueda y el filtro de estado (todas las páginas).
  totalPersonas: number;
  // Resumen del encabezado: sobre la búsqueda, sin el filtro de estado.
  resumen: {
    personas: number;
    solicitudes: number;
    porEstado: Record<EstadoLead, number>;
  };
  pagina: number;
  porPagina: number | null;
}

export interface OpcionesBandeja {
  q?: string;
  estado?: EstadoLead | null;
  pagina?: number;
  // `null` trae todas las personas (exportación).
  porPagina?: number | null;
}

function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);
}

// Bandeja de entrada: leads agrupados por persona. Siempre filtra por `oferente_id`.
export async function listarBandejaDelOferente(
  oferenteId: string,
  opciones: OpcionesBandeja = {},
): Promise<BandejaLeads> {
  const condiciones = [eq(contactRequest.oferenteId, oferenteId)];
  const texto = opciones.q?.trim();
  if (texto) {
    const patron = `%${escaparLike(texto)}%`;
    const coincidencia = or(
      ilike(usuario.nombre, patron),
      ilike(usuario.email, patron),
      ilike(usuario.telefono, patron),
    );
    if (coincidencia) condiciones.push(coincidencia);
  }

  const filas = await db
    .select({
      buscadorId: contactRequest.buscadorId,
      nombre: usuario.nombre,
      email: usuario.email,
      telefono: usuario.telefono,
      estado: contactRequest.estado,
      propiedadId: contactRequest.propiedadId,
      tituloPropiedad: propiedad.titulo,
      direccionPropiedad: propiedad.direccion,
      tipo: propiedad.tipo,
      modalidad: propiedad.modalidad,
      quiereFinanciamiento: contactRequest.quiereFinanciamiento,
      mensaje: contactRequest.mensaje,
      createdAt: contactRequest.createdAt,
    })
    .from(contactRequest)
    .innerJoin(propiedad, eq(contactRequest.propiedadId, propiedad.id))
    .innerJoin(usuario, eq(contactRequest.buscadorId, usuario.id))
    .where(and(...condiciones))
    .orderBy(desc(contactRequest.createdAt));

  // Las filas vienen de la más reciente a la más antigua: la primera de cada buscador define su
  // estado, su última fecha y su último mensaje.
  const personas = new Map<string, PersonaLead>();
  const propiedadesPorPersona = new Map<string, Map<string, PropiedadDeLead>>();
  for (const fila of filas) {
    let persona = personas.get(fila.buscadorId);
    if (!persona) {
      persona = {
        buscadorId: fila.buscadorId,
        nombre: fila.nombre,
        email: fila.email,
        telefono: fila.telefono,
        estado: fila.estado as EstadoLead,
        solicitudes: 0,
        ultimaFecha: fila.createdAt,
        quiereFinanciamiento: false,
        ultimoMensaje: fila.mensaje,
        conversacionId: null,
        propiedades: [],
      };
      personas.set(fila.buscadorId, persona);
      propiedadesPorPersona.set(fila.buscadorId, new Map());
    }
    persona.solicitudes += 1;
    persona.quiereFinanciamiento ||= fila.quiereFinanciamiento;

    const propiedades = propiedadesPorPersona.get(fila.buscadorId);
    const existente = propiedades?.get(fila.propiedadId);
    if (existente) {
      existente.solicitudes += 1;
    } else if (propiedades) {
      const nueva: PropiedadDeLead = {
        id: fila.propiedadId,
        titulo: fila.tituloPropiedad,
        direccion: fila.direccionPropiedad,
        tipo: fila.tipo,
        modalidad: fila.modalidad,
        solicitudes: 1,
        fotoUrl: null,
      };
      propiedades.set(fila.propiedadId, nueva);
      persona.propiedades.push(nueva);
    }
  }

  const todas = [...personas.values()];
  const porEstado = Object.fromEntries(ESTADOS_LEAD.map((estado) => [estado, 0])) as Record<
    EstadoLead,
    number
  >;
  for (const persona of todas) porEstado[persona.estado] += 1;

  const filtradas = opciones.estado ? todas.filter((p) => p.estado === opciones.estado) : todas;
  const porPagina = opciones.porPagina === null ? null : (opciones.porPagina ?? POR_PAGINA_LEADS);
  const pagina = Math.max(1, opciones.pagina ?? 1);
  const visibles =
    porPagina === null ? filtradas : filtradas.slice((pagina - 1) * porPagina, pagina * porPagina);

  const fotos = await obtenerPrimerasFotos([
    ...new Set(visibles.flatMap((persona) => persona.propiedades.map((p) => p.id))),
  ]);
  for (const persona of visibles) {
    for (const propiedadDeLead of persona.propiedades) {
      propiedadDeLead.fotoUrl = fotos.get(propiedadDeLead.id)?.storageUrl ?? null;
    }
  }

  // Las propiedades de cada persona vienen de la más reciente a la más antigua: el chat de la
  // primera que tenga conversación es el que se abre desde la bandeja.
  const buscadores = visibles.map((persona) => persona.buscadorId);
  if (buscadores.length > 0) {
    const chats = await db
      .select({
        id: conversacion.id,
        buscadorId: conversacion.iniciadorId,
        propiedadId: conversacion.propiedadId,
      })
      .from(conversacion)
      .where(
        and(eq(conversacion.duenoId, oferenteId), inArray(conversacion.iniciadorId, buscadores)),
      );
    for (const persona of visibles) {
      const chat = persona.propiedades
        .map((p) =>
          chats.find((c) => c.buscadorId === persona.buscadorId && c.propiedadId === p.id),
        )
        .find(Boolean);
      persona.conversacionId = chat?.id ?? null;
    }
  }

  return {
    personas: visibles,
    totalPersonas: filtradas.length,
    resumen: { personas: todas.length, solicitudes: filas.length, porEstado },
    pagina,
    porPagina,
  };
}

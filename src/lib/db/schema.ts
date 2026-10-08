// src/lib/db/schema.ts — fuente única de verdad. Cambios aquí + `pnpm db:generate`.
import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const usuario = pgTable(
  "usuario",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull().unique(),
    nombre: text("nombre").notNull(),
    telefono: text("telefono"),
    // Solo oferentes: "particular" (dueño directo) o "inmobiliaria" (agencia o agente). Lo capturan
    // el registro y "Publica tu espacio"; la ficha pública lo muestra.
    tipoAnunciante: text("tipo_anunciante"),
    rol: text("rol").notNull(),
    isBroker: boolean("is_broker").notNull().default(false),
    brokerCode: text("broker_code").unique(),
    referralBrokerId: uuid("referral_broker_id").references((): AnyPgColumn => usuario.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("chk_usuario_rol", sql`${t.rol} in ('buscador','oferente','admin')`),
    check(
      "chk_usuario_tipo_anunciante",
      sql`${t.tipoAnunciante} is null or ${t.tipoAnunciante} in ('particular','inmobiliaria')`,
    ),
    check("chk_usuario_broker_code", sql`${t.brokerCode} is null or ${t.isBroker} = true`),
  ],
);

// Los 32 estados de México. Debe coincidir con CODIGOS_ESTADO de src/lib/estados.ts (esta capa no
// importa nada interno; src/lib/estados.test.ts verifica que sean iguales).
export const CODIGOS_ESTADO_DB = [
  "Aguascalientes",
  "Baja California",
  "Baja California Sur",
  "Campeche",
  "Chiapas",
  "Chihuahua",
  "Ciudad de Mexico",
  "Coahuila",
  "Colima",
  "Durango",
  "Estado de Mexico",
  "Guanajuato",
  "Guerrero",
  "Hidalgo",
  "Jalisco",
  "Michoacan",
  "Morelos",
  "Nayarit",
  "Nuevo Leon",
  "Oaxaca",
  "Puebla",
  "Queretaro",
  "Quintana Roo",
  "SLP",
  "Sinaloa",
  "Sonora",
  "Tabasco",
  "Tamaulipas",
  "Tlaxcala",
  "Veracruz",
  "Yucatan",
  "Zacatecas",
] as const;

export const propiedad = pgTable(
  "propiedad",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    oferenteId: uuid("oferente_id")
      .notNull()
      .references(() => usuario.id),
    tipo: text("tipo").notNull(),
    modalidad: text("modalidad").notNull(),
    direccion: text("direccion").notNull(),
    direccionNormalizada: text("direccion_normalizada").notNull(),
    lat: numeric("lat", { precision: 9, scale: 6 }).notNull(),
    lng: numeric("lng", { precision: 9, scale: 6 }).notNull(),
    latRedondeada: numeric("lat_redondeada", { precision: 9, scale: 5 })
      .generatedAlwaysAs(sql`round(lat, 5)`)
      .notNull(),
    lngRedondeada: numeric("lng_redondeada", { precision: 9, scale: 5 })
      .generatedAlwaysAs(sql`round(lng, 5)`)
      .notNull(),
    estado: text("estado").notNull(),
    ciudad: text("ciudad").notNull(),
    descripcion: text("descripcion").notNull(),
    activo: boolean("activo").notNull().default(true),
    aceptaFinanciamiento: boolean("acepta_financiamiento").notNull().default(false),
    // Datos del espacio (todos opcionales: las propiedades anteriores no los tienen). Un precio
    // nulo se muestra como "Precio a consultar". En renta el precio es mensual.
    precio: numeric("precio", { precision: 14, scale: 2, mode: "number" }),
    moneda: text("moneda").notNull().default("MXN"),
    precioUnidad: text("precio_unidad").notNull().default("total"),
    mantenimiento: numeric("mantenimiento", { precision: 12, scale: 2, mode: "number" }),
    superficieConstruidaM2: numeric("superficie_construida_m2", {
      precision: 12,
      scale: 2,
      mode: "number",
    }),
    superficieTerrenoM2: numeric("superficie_terreno_m2", {
      precision: 12,
      scale: 2,
      mode: "number",
    }),
    banos: integer("banos"),
    estacionamientos: integer("estacionamientos"),
    // Solo aplican a naves industriales.
    alturaLibreM: numeric("altura_libre_m", { precision: 5, scale: 2, mode: "number" }),
    andenes: integer("andenes"),
    potenciaKva: integer("potencia_kva"),
    // Identificación propia del oferente (E1-T2). `titulo` es texto público; `referencia` es interna.
    referencia: text("referencia"),
    titulo: text("titulo"),
    // Contacto de la agencia que se muestra en la ficha pública (nulo = el del oferente).
    contactoId: uuid("contacto_id").references((): AnyPgColumn => agenciaContacto.id, {
      onDelete: "set null",
    }),
    // Red inmobiliaria (E1-T5): la comisión que se comparte nunca se expone en consultas públicas.
    compartidaEnRed: boolean("compartida_en_red").notNull().default(false),
    comisionPct: numeric("comision_pct", { precision: 5, scale: 2, mode: "number" }),
    exclusiva: boolean("exclusiva").notNull().default(false),
    estadoPublicacion: text("estado_publicacion").notNull().default("pendiente"),
    motivoRechazo: text("motivo_rechazo"),
    revisadaPor: uuid("revisada_por").references(() => usuario.id),
    revisadaEn: timestamp("revisada_en", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_propiedad_oferente_id").on(t.oferenteId),
    index("idx_propiedad_busqueda")
      .on(t.estado, t.ciudad, t.modalidad, t.tipo)
      .where(sql`${t.activo} = true`),
    index("idx_propiedad_revision")
      .on(t.updatedAt)
      .where(sql`${t.activo} = true and ${t.estadoPublicacion} = 'pendiente'`),
    uniqueIndex("uq_propiedad_duplicado")
      .on(t.direccionNormalizada, t.latRedondeada, t.lngRedondeada)
      .where(sql`${t.activo} = true and ${t.estadoPublicacion} <> 'rechazada'`),
    check(
      "chk_propiedad_publicacion",
      sql`${t.estadoPublicacion} in ('pendiente','publicada','rechazada')`,
    ),
    check(
      "chk_propiedad_motivo_rechazo",
      sql`(${t.estadoPublicacion} = 'rechazada' and ${t.motivoRechazo} is not null and length(btrim(${t.motivoRechazo})) > 0) or (${t.estadoPublicacion} <> 'rechazada' and ${t.motivoRechazo} is null)`,
    ),
    check(
      "chk_propiedad_revision",
      sql`(${t.estadoPublicacion} = 'pendiente' and ${t.revisadaPor} is null and ${t.revisadaEn} is null) or (${t.estadoPublicacion} <> 'pendiente' and (${t.revisadaPor} is null) = (${t.revisadaEn} is null))`,
    ),
    check("chk_propiedad_tipo", sql`${t.tipo} in ('nave_industrial','oficina','local_comercial')`),
    check("chk_propiedad_modalidad", sql`${t.modalidad} in ('renta','venta','desde_cero')`),
    check(
      "chk_propiedad_estado",
      sql`${t.estado} in (${sql.raw(CODIGOS_ESTADO_DB.map((codigo) => `'${codigo}'`).join(","))})`,
    ),
    check("chk_propiedad_moneda", sql`${t.moneda} in ('MXN','USD')`),
    check(
      "chk_propiedad_comision",
      sql`${t.comisionPct} is null or (${t.comisionPct} >= 0 and ${t.comisionPct} <= 100)`,
    ),
    check(
      "chk_propiedad_referencia_titulo",
      sql`(${t.referencia} is null or length(btrim(${t.referencia})) between 1 and 60) and (${t.titulo} is null or length(btrim(${t.titulo})) between 1 and 160)`,
    ),
    index("idx_propiedad_red")
      .on(t.createdAt)
      .where(sql`${t.compartidaEnRed} = true and ${t.activo} = true`),
    check("chk_propiedad_precio_unidad", sql`${t.precioUnidad} in ('total','m2')`),
    check(
      "chk_propiedad_detalles_no_negativos",
      sql`coalesce(${t.precio}, 0) >= 0 and coalesce(${t.mantenimiento}, 0) >= 0 and coalesce(${t.superficieConstruidaM2}, 0) >= 0 and coalesce(${t.superficieTerrenoM2}, 0) >= 0 and coalesce(${t.banos}, 0) >= 0 and coalesce(${t.estacionamientos}, 0) >= 0 and coalesce(${t.alturaLibreM}, 0) >= 0 and coalesce(${t.andenes}, 0) >= 0 and coalesce(${t.potenciaKva}, 0) >= 0`,
    ),
  ],
);

export const propiedadFoto = pgTable(
  "propiedad_foto",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    propiedadId: uuid("propiedad_id")
      .notNull()
      .references(() => propiedad.id, { onDelete: "cascade" }),
    storageUrl: text("storage_url").notNull(),
    orden: integer("orden").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_propiedad_foto_propiedad_id").on(t.propiedadId)],
);

// Perfil comercial del oferente (blueprints/panel-oferente, E1-T1). Un perfil por usuario;
// `logo_url` es opcional (sin logo se muestran las iniciales del nombre).
export const agenciaPerfil = pgTable(
  "agencia_perfil",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id),
    nombre: text("nombre").notNull(),
    descripcion: text("descripcion").notNull().default(""),
    logoUrl: text("logo_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_agencia_perfil_usuario").on(t.usuarioId),
    check("chk_agencia_perfil_nombre", sql`length(btrim(${t.nombre})) between 1 and 120`),
    check("chk_agencia_perfil_descripcion", sql`length(${t.descripcion}) <= 1000`),
  ],
);

// Correos, teléfonos y WhatsApp de la agencia. Cada propiedad podrá elegir uno (E1-T2).
export const agenciaContacto = pgTable(
  "agencia_contacto",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id),
    tipo: text("tipo").notNull(),
    valor: text("valor").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_agencia_contacto_usuario_id").on(t.usuarioId),
    uniqueIndex("uq_agencia_contacto_usuario_tipo_valor").on(t.usuarioId, t.tipo, t.valor),
    check("chk_agencia_contacto_tipo", sql`${t.tipo} in ('email','telefono','whatsapp')`),
    check("chk_agencia_contacto_valor", sql`length(btrim(${t.valor})) between 1 and 200`),
  ],
);

// Espacios que un usuario marcó como favoritos. Un par usuario–propiedad aparece una sola vez.
export const favorito = pgTable(
  "favorito",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    propiedadId: uuid("propiedad_id")
      .notNull()
      .references(() => propiedad.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_favorito_usuario_propiedad").on(t.usuarioId, t.propiedadId)],
);

// Búsquedas guardadas: `consulta` es la query string canónica de /buscar (la arma
// `busquedaAParams`). `ultima_vista_en` permite contar los espacios publicados desde entonces.
export const busquedaGuardada = pgTable(
  "busqueda_guardada",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    nombre: text("nombre").notNull(),
    consulta: text("consulta").notNull(),
    ultimaVistaEn: timestamp("ultima_vista_en", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_busqueda_guardada_usuario_consulta").on(t.usuarioId, t.consulta),
    check("chk_busqueda_guardada_nombre", sql`length(btrim(${t.nombre})) between 1 and 120`),
  ],
);

export const contactRequest = pgTable(
  "contact_request",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    buscadorId: uuid("buscador_id")
      .notNull()
      .references(() => usuario.id),
    propiedadId: uuid("propiedad_id")
      .notNull()
      .references(() => propiedad.id),
    oferenteId: uuid("oferente_id")
      .notNull()
      .references(() => usuario.id),
    brokerId: uuid("broker_id").references(() => usuario.id),
    quiereFinanciamiento: boolean("quiere_financiamiento").notNull().default(false),
    // Mensaje opcional del buscador (preguntas rápidas o texto libre), máximo 1000 caracteres.
    mensaje: text("mensaje"),
    // Embudo de seguimiento del oferente (E1-T4). Se cambia por persona: todas las solicitudes de
    // un buscador a un mismo oferente comparten estado.
    estado: text("estado").notNull().default("nueva"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "chk_contact_request_estado",
      sql`${t.estado} in ('nueva','contactada','visita','propuesta','ganada','descartada')`,
    ),
    check(
      "chk_contact_request_mensaje",
      sql`${t.mensaje} is null or length(${t.mensaje}) between 1 and 1000`,
    ),
    index("idx_contact_request_oferente_id").on(t.oferenteId),
    index("idx_contact_request_broker_id").on(t.brokerId).where(sql`${t.brokerId} is not null`),
    index("idx_contact_request_propiedad_id").on(t.propiedadId),
  ],
);

// Paso 26 — no existe en el esquema del paso 4.
export const brokerSolicitud = pgTable(
  "broker_solicitud",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id),
    mensaje: text("mensaje").notNull(),
    empresa: text("empresa").notNull().default(""),
    estado: text("estado").notNull().default("pendiente"),
    motivoDenegacion: text("motivo_denegacion"),
    resueltaPor: uuid("resuelta_por").references(() => usuario.id),
    resueltaEn: timestamp("resuelta_en", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_broker_solicitud_pendiente")
      .on(t.usuarioId)
      .where(sql`${t.estado} = 'pendiente'`),
    index("idx_broker_solicitud_usuario_id").on(t.usuarioId),
    index("idx_broker_solicitud_pendientes").on(t.createdAt).where(sql`${t.estado} = 'pendiente'`),
    check("chk_broker_solicitud_estado", sql`${t.estado} in ('pendiente','aprobada','denegada')`),
    check("chk_broker_solicitud_mensaje", sql`length(btrim(${t.mensaje})) > 0`),
    check(
      "chk_broker_solicitud_resolucion",
      sql`(${t.estado} = 'pendiente' and ${t.resueltaPor} is null and ${t.resueltaEn} is null) or (${t.estado} <> 'pendiente' and ${t.resueltaPor} is not null and ${t.resueltaEn} is not null)`,
    ),
    check(
      "chk_broker_solicitud_motivo",
      sql`${t.motivoDenegacion} is null or ${t.estado} = 'denegada'`,
    ),
  ],
);

// Paso 26 — no existe en el esquema del paso 4.
export const brokerRevocacion = pgTable(
  "broker_revocacion",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id),
    brokerCode: text("broker_code").notNull(),
    motivo: text("motivo").notNull(),
    revocadaPor: uuid("revocada_por")
      .notNull()
      .references(() => usuario.id),
    revocadaEn: timestamp("revocada_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_broker_revocacion_usuario_id").on(t.usuarioId),
    check("chk_broker_revocacion_motivo", sql`length(btrim(${t.motivo})) > 0`),
  ],
);

// Paso 26 — no existe en el esquema del paso 4. Escrita por el paso 30 (revocarBroker()), nunca
// actualizada ni borrada después del INSERT: es la fotografía inmutable de la decisión #17 (§20.3).
export const brokerAtribucionHistorica = pgTable(
  "broker_atribucion_historica",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    brokerRevocacionId: uuid("broker_revocacion_id")
      .notNull()
      .references(() => brokerRevocacion.id),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id),
    brokerCode: text("broker_code").notNull(),
    contactRequestIds: uuid("contact_request_ids").array().notNull().default(sql`'{}'::uuid[]`),
    totalLeads: integer("total_leads").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_broker_atribucion_historica_revocacion").on(t.brokerRevocacionId),
    index("idx_broker_atribucion_historica_usuario_id").on(t.usuarioId),
    check("chk_broker_atribucion_historica_total_leads", sql`${t.totalLeads} >= 0`),
  ],
);

// Paso 36 — no existe en el esquema del paso 4.
export const rateLimitHit = pgTable(
  "rate_limit_hit",
  {
    clave: text("clave").notNull(),
    ventanaInicio: timestamp("ventana_inicio", { withTimezone: true }).notNull(),
    conteo: integer("conteo").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.clave, t.ventanaInicio] })],
);

// Contadores diarios por propiedad (E1-T3): una fila por (propiedad, día) en vez de una por visita.
export const propiedadMetricaDiaria = pgTable(
  "propiedad_metrica_diaria",
  {
    propiedadId: uuid("propiedad_id")
      .notNull()
      .references(() => propiedad.id, { onDelete: "cascade" }),
    dia: date("dia", { mode: "string" }).notNull(),
    impresiones: integer("impresiones").notNull().default(0),
    visitas: integer("visitas").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.propiedadId, t.dia] }),
    check("chk_metrica_no_negativa", sql`${t.impresiones} >= 0 and ${t.visitas} >= 0`),
  ],
);

// Chat entre oferentes sobre una propiedad de la Red (E1-T6). Una conversación por par
// (propiedad, iniciador); el otro participante es siempre el dueño de la propiedad.
export const conversacion = pgTable(
  "conversacion",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    propiedadId: uuid("propiedad_id")
      .notNull()
      .references(() => propiedad.id),
    iniciadorId: uuid("iniciador_id")
      .notNull()
      .references(() => usuario.id),
    duenoId: uuid("dueno_id")
      .notNull()
      .references(() => usuario.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_conversacion_propiedad_iniciador").on(t.propiedadId, t.iniciadorId),
    index("idx_conversacion_iniciador_id").on(t.iniciadorId),
    index("idx_conversacion_dueno_id").on(t.duenoId),
    check("chk_conversacion_participantes", sql`${t.iniciadorId} <> ${t.duenoId}`),
  ],
);

export const mensaje = pgTable(
  "mensaje",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    conversacionId: uuid("conversacion_id")
      .notNull()
      .references(() => conversacion.id, { onDelete: "cascade" }),
    autorId: uuid("autor_id")
      .notNull()
      .references(() => usuario.id),
    texto: text("texto").notNull(),
    leidoEn: timestamp("leido_en", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_mensaje_conversacion").on(t.conversacionId, t.createdAt),
    check("chk_mensaje_texto", sql`length(btrim(${t.texto})) between 1 and 2000`),
  ],
);

export const usuarioRelations = relations(usuario, ({ many, one }) => ({
  propiedades: many(propiedad),
  referidoPor: one(usuario, {
    fields: [usuario.referralBrokerId],
    references: [usuario.id],
  }),
}));

export const propiedadRelations = relations(propiedad, ({ one, many }) => ({
  oferente: one(usuario, { fields: [propiedad.oferenteId], references: [usuario.id] }),
  fotos: many(propiedadFoto),
}));

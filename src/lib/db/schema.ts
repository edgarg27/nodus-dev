// src/lib/db/schema.ts — fuente única de verdad. Cambios aquí + `pnpm db:generate`.
import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  numeric,
  pgTable,
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
    rol: text("rol").notNull(),
    isBroker: boolean("is_broker").notNull().default(false),
    brokerCode: text("broker_code").unique(),
    referralBrokerId: uuid("referral_broker_id").references((): AnyPgColumn => usuario.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("chk_usuario_rol", sql`${t.rol} in ('buscador','oferente','admin')`),
    check("chk_usuario_broker_code", sql`${t.brokerCode} is null or ${t.isBroker} = true`),
  ],
);

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
    check("chk_propiedad_estado", sql`${t.estado} in ('SLP','Aguascalientes','Leon')`),
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
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

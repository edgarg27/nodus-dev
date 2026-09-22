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

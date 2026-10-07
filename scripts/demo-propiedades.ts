import { eq } from "drizzle-orm";
import { db } from "../src/lib/db/client.ts";
import { assertSafeToReset } from "../src/lib/db/dev-guard.ts";
import { propiedad, propiedadFoto, usuario } from "../src/lib/db/schema.ts";
import { normalizeAddress } from "../src/lib/normalize-address.ts";

// Espacios de demostración para revisar la plataforma: `pnpm db:demo`.
// - No borra nada más que lo suyo: todo cuelga del usuario oferente "Captive Demo"; al volver a
//   correrlo se reemplazan sus espacios (útil después de `pnpm test`, que vacía la base).
// - Solo corre contra el proyecto de desarrollo (misma guardia que el seed y las pruebas).
// - Las fotos de oficinas son cuadros del video de la portada (public/demo/); naves y locales
//   se muestran con su ícono hasta que se suban fotos reales.

const OFERENTE_DEMO = {
  id: "11111111-1111-4111-8111-000000000001",
  email: "demo.oferente@nodus.dev",
  nombre: "Captive Demo",
  rol: "oferente",
  telefono: "444 100 2000",
} as const;

const FOTOS_OFICINA = [
  "/demo/oficina-1.jpg",
  "/demo/oficina-2.jpg",
  "/demo/oficina-3.jpg",
  "/demo/oficina-4.jpg",
];

type Espacio = Omit<
  typeof propiedad.$inferInsert,
  "oferenteId" | "direccionNormalizada" | "estadoPublicacion" | "lat" | "lng"
> & { lat: number; lng: number };

const ESPACIOS: Espacio[] = [
  {
    tipo: "nave_industrial",
    modalidad: "renta",
    direccion: "Eje 114 No. 210, Zona Industrial",
    estado: "SLP",
    ciudad: "San Luis Potosí",
    lat: 22.1012,
    lng: -100.9105,
    descripcion:
      "Nave en el corredor del Eje 114 con oficinas administrativas, comedor y patio de maniobras para tráileres. Acceso controlado 24/7.",
    precio: 4.8,
    moneda: "USD",
    precioUnidad: "m2",
    superficieConstruidaM2: 3200,
    superficieTerrenoM2: 5000,
    banos: 4,
    estacionamientos: 40,
    alturaLibreM: 10.5,
    andenes: 6,
    potenciaKva: 750,
    aceptaFinanciamiento: false,
  },
  {
    tipo: "nave_industrial",
    modalidad: "venta",
    direccion: "Parque Industrial Logistik II, Villa de Reyes",
    estado: "SLP",
    ciudad: "Villa de Reyes",
    lat: 21.8031,
    lng: -100.9341,
    descripcion:
      "Nave nueva en parque con certificación LEED, a 5 minutos de la autopista 57. Lista para operar.",
    precio: 98000000,
    moneda: "MXN",
    precioUnidad: "total",
    superficieConstruidaM2: 6500,
    superficieTerrenoM2: 11000,
    banos: 6,
    estacionamientos: 80,
    alturaLibreM: 12,
    andenes: 10,
    potenciaKva: 1500,
    aceptaFinanciamiento: true,
  },
  {
    tipo: "oficina",
    modalidad: "renta",
    direccion: "Av. Venustiano Carranza 2000, Tequisquiapan",
    estado: "SLP",
    ciudad: "San Luis Potosí",
    lat: 22.1495,
    lng: -100.9902,
    descripcion:
      "Oficina corporativa en planta alta con recepción, sala de juntas y cuatro privados. Mantenimiento incluye seguridad y limpieza de áreas comunes.",
    precio: 38000,
    moneda: "MXN",
    precioUnidad: "total",
    mantenimiento: 3500,
    superficieConstruidaM2: 380,
    banos: 3,
    estacionamientos: 4,
    aceptaFinanciamiento: false,
  },
  {
    tipo: "oficina",
    modalidad: "renta",
    direccion: "Blvd. José María Chávez 1800, Aguascalientes",
    estado: "Aguascalientes",
    ciudad: "Aguascalientes",
    lat: 21.8652,
    lng: -102.2905,
    descripcion:
      "Piso completo en torre de oficinas con vista a la ciudad, elevador y estacionamiento techado.",
    precio: 62000,
    moneda: "MXN",
    precioUnidad: "total",
    mantenimiento: 6000,
    superficieConstruidaM2: 520,
    banos: 4,
    estacionamientos: 8,
    aceptaFinanciamiento: false,
  },
  {
    tipo: "nave_industrial",
    modalidad: "renta",
    direccion: "Parque Industrial San Francisco, San Francisco de los Romo",
    estado: "Aguascalientes",
    ciudad: "San Francisco de los Romo",
    lat: 21.9875,
    lng: -102.2701,
    descripcion: "Nave con crane de 10 toneladas, ideal para manufactura automotriz.",
    precio: 5.2,
    moneda: "USD",
    precioUnidad: "m2",
    superficieConstruidaM2: 4100,
    superficieTerrenoM2: 7000,
    banos: 4,
    estacionamientos: 50,
    alturaLibreM: 11,
    andenes: 5,
    potenciaKva: 1000,
    aceptaFinanciamiento: false,
  },
  {
    tipo: "local_comercial",
    modalidad: "renta",
    direccion: "Blvd. Adolfo López Mateos 3401, León",
    estado: "Guanajuato",
    ciudad: "León",
    lat: 21.1308,
    lng: -101.6745,
    descripcion:
      "Local a pie de calle sobre bulevar de alto flujo, con fachada de cristal y bodega.",
    precio: 45000,
    moneda: "MXN",
    precioUnidad: "total",
    superficieConstruidaM2: 210,
    banos: 2,
    estacionamientos: 6,
    aceptaFinanciamiento: false,
  },
  {
    tipo: "nave_industrial",
    modalidad: "renta",
    direccion: "Puerto Interior, Silao",
    estado: "Guanajuato",
    ciudad: "Silao",
    lat: 20.9765,
    lng: -101.4401,
    descripcion: "Nave en Guanajuato Puerto Interior, junto a la aduana y la vía del tren.",
    precio: 5.5,
    moneda: "USD",
    precioUnidad: "m2",
    superficieConstruidaM2: 8000,
    superficieTerrenoM2: 14000,
    banos: 6,
    estacionamientos: 90,
    alturaLibreM: 12,
    andenes: 12,
    potenciaKva: 2000,
    aceptaFinanciamiento: true,
  },
  {
    tipo: "oficina",
    modalidad: "venta",
    direccion: "Av. Constitución 400, Centro, Monterrey",
    estado: "Nuevo Leon",
    ciudad: "Monterrey",
    lat: 25.6694,
    lng: -100.3099,
    descripcion: "Oficina en venta en torre clase A frente al Paseo Santa Lucía.",
    precio: 14500000,
    moneda: "MXN",
    precioUnidad: "total",
    mantenimiento: 9000,
    superficieConstruidaM2: 310,
    banos: 2,
    estacionamientos: 5,
    aceptaFinanciamiento: true,
  },
  {
    tipo: "nave_industrial",
    modalidad: "desde_cero",
    direccion: "Parque Industrial Stiva, Apodaca",
    estado: "Nuevo Leon",
    ciudad: "Apodaca",
    lat: 25.7811,
    lng: -100.1882,
    descripcion:
      "Terreno industrial para nave a la medida (build-to-suit) junto al aeropuerto de Monterrey.",
    precio: null,
    superficieTerrenoM2: 20000,
    aceptaFinanciamiento: true,
  },
  {
    tipo: "local_comercial",
    modalidad: "renta",
    direccion: "Av. Chapultepec 120, Americana, Guadalajara",
    estado: "Jalisco",
    ciudad: "Guadalajara",
    lat: 20.6748,
    lng: -103.3697,
    descripcion: "Local en esquina sobre Av. Chapultepec, zona de restaurantes y oficinas.",
    precio: 58000,
    moneda: "MXN",
    precioUnidad: "total",
    superficieConstruidaM2: 160,
    banos: 2,
    aceptaFinanciamiento: false,
  },
  {
    tipo: "oficina",
    modalidad: "renta",
    direccion: "Paseo de la Reforma 250, Juárez, CDMX",
    estado: "Ciudad de Mexico",
    ciudad: "Ciudad de México",
    lat: 19.4285,
    lng: -99.1622,
    descripcion: "Oficina amueblada en Reforma con recepción, sala de juntas y vista panorámica.",
    precio: 1800,
    moneda: "USD",
    precioUnidad: "total",
    mantenimiento: 450,
    superficieConstruidaM2: 140,
    banos: 2,
    estacionamientos: 2,
    aceptaFinanciamiento: false,
  },
  {
    tipo: "nave_industrial",
    modalidad: "renta",
    direccion: "Parque Industrial Querétaro, El Marqués",
    estado: "Queretaro",
    ciudad: "El Marqués",
    lat: 20.6421,
    lng: -100.2718,
    descripcion: "Nave con oficinas y comedor en el corredor aeroespacial de Querétaro.",
    precio: 165000,
    moneda: "MXN",
    precioUnidad: "total",
    superficieConstruidaM2: 2800,
    superficieTerrenoM2: 4200,
    banos: 4,
    estacionamientos: 35,
    alturaLibreM: 9.5,
    andenes: 4,
    potenciaKva: 500,
    aceptaFinanciamiento: false,
  },
];

async function main() {
  assertSafeToReset(process.env);

  await db
    .insert(usuario)
    .values(OFERENTE_DEMO)
    .onConflictDoUpdate({ target: usuario.id, set: { nombre: OFERENTE_DEMO.nombre } });

  // Reemplaza solo los espacios del oferente demo (las fotos se borran en cascada).
  await db.delete(propiedad).where(eq(propiedad.oferenteId, OFERENTE_DEMO.id));

  let fotoSiguiente = 0;
  for (const espacio of ESPACIOS) {
    const [fila] = await db
      .insert(propiedad)
      .values({
        ...espacio,
        lat: String(espacio.lat),
        lng: String(espacio.lng),
        oferenteId: OFERENTE_DEMO.id,
        direccionNormalizada: normalizeAddress(espacio.direccion),
        estadoPublicacion: "publicada",
        revisadaPor: OFERENTE_DEMO.id,
        revisadaEn: new Date(),
      })
      .returning({ id: propiedad.id });
    if (!fila) throw new Error(`No se insertó ${espacio.direccion}`);

    if (espacio.tipo === "oficina") {
      // Dos fotos por oficina, rotando entre las cuatro disponibles.
      await db.insert(propiedadFoto).values(
        [0, 1].map((orden) => ({
          propiedadId: fila.id,
          storageUrl: FOTOS_OFICINA[(fotoSiguiente + orden) % FOTOS_OFICINA.length] as string,
          orden,
        })),
      );
      fotoSiguiente += 2;
    }
  }

  console.log(
    `Listo: ${ESPACIOS.length} espacios de demostración publicados (oferente ${OFERENTE_DEMO.email}).`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

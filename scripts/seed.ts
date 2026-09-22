import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db/client.ts";
import { propiedad, usuario } from "../src/lib/db/schema.ts";
import { resetTestDatabase } from "../tests/helpers/reset-db.ts";

async function seed() {
  await resetTestDatabase();

  const anaBrokerId = randomUUID();
  const nodusStaffId = randomUUID();
  const carlosBuscadorId = randomUUID();

  await db.insert(usuario).values([
    {
      id: anaBrokerId,
      email: "ana.broker@nodus.dev",
      nombre: "Ana Broker",
      rol: "oferente",
      isBroker: true,
      brokerCode: "BRK-DEMO",
    },
    {
      id: nodusStaffId,
      email: "staff@nodus.dev",
      nombre: "Nodus Staff",
      rol: "oferente",
      isBroker: false,
    },
    {
      id: carlosBuscadorId,
      email: "carlos.buscador@nodus.dev",
      nombre: "Carlos Buscador",
      rol: "buscador",
      referralBrokerId: anaBrokerId,
    },
  ]);

  await db.insert(propiedad).values([
    {
      oferenteId: nodusStaffId,
      tipo: "nave_industrial",
      modalidad: "renta",
      direccion: "Av. Industrias 100, San Luis Potosí",
      direccionNormalizada: "av industrias 100 san luis potosi",
      lat: "22.156370",
      lng: "-100.978890",
      estado: "SLP",
      ciudad: "San Luis Potosí",
      descripcion: "Nave industrial de 1200 m² en el parque industrial de SLP.",
      activo: true,
      estadoPublicacion: "publicada",
    },
    {
      oferenteId: nodusStaffId,
      tipo: "oficina",
      modalidad: "venta",
      direccion: "Blvd. José María Chávez 200, Aguascalientes",
      direccionNormalizada: "blvd jose maria chavez 200 aguascalientes",
      lat: "21.885300",
      lng: "-102.291600",
      estado: "Aguascalientes",
      ciudad: "Aguascalientes",
      descripcion: "Oficina corporativa en zona financiera de Aguascalientes.",
      activo: true,
      estadoPublicacion: "publicada",
    },
    {
      oferenteId: anaBrokerId,
      tipo: "local_comercial",
      modalidad: "desde_cero",
      direccion: "Av. López Mateos 300, León",
      direccionNormalizada: "av lopez mateos 300 leon",
      lat: "21.125000",
      lng: "-101.686000",
      estado: "Leon",
      ciudad: "León",
      descripcion: "Local comercial a construir en avenida principal de León.",
      activo: true,
      estadoPublicacion: "publicada",
    },
  ]);

  console.log("seed completo: 2 oferentes, 1 buscador, 3 propiedades publicadas");
}

await seed();
process.exit(0);

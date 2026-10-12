import { crearClienteAdmin } from "../src/server/supabase/admin.ts";

// `verificacion-documentos` es privado: guarda identificaciones y comprobantes de brokers y dueños,
// que solo se abren con una URL firmada de corta duración (src/server/verificacion/documentos.ts).
const BUCKETS = [
  {
    nombre: "propiedades-fotos",
    opciones: {
      public: true,
      fileSizeLimit: 4000000,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    },
  },
  {
    nombre: "verificacion-documentos",
    opciones: {
      public: false,
      fileSizeLimit: 4000000,
      allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
    },
  },
];

async function setupStorage() {
  const admin = crearClienteAdmin();

  for (const { nombre, opciones } of BUCKETS) {
    const { data: bucket } = await admin.storage.getBucket(nombre);
    const { error } = bucket
      ? await admin.storage.updateBucket(nombre, opciones)
      : await admin.storage.createBucket(nombre, opciones);
    if (error) {
      console.error(error.message);
      process.exit(1);
    }
    console.log(`bucket ${nombre} listo (${opciones.public ? "público" : "privado"})`);
  }

  process.exit(0);
}

await setupStorage();

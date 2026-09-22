import { crearClienteAdmin } from "../src/server/supabase/admin.ts";

const BUCKET = "propiedades-fotos";
const OPCIONES = {
  public: true,
  fileSizeLimit: 4000000,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
};

async function setupStorage() {
  const admin = crearClienteAdmin();
  const { data: bucket } = await admin.storage.getBucket(BUCKET);

  if (!bucket) {
    const { error } = await admin.storage.createBucket(BUCKET, OPCIONES);
    if (error) {
      console.error(error.message);
      process.exit(1);
    }
  } else {
    const { error } = await admin.storage.updateBucket(BUCKET, OPCIONES);
    if (error) {
      console.error(error.message);
      process.exit(1);
    }
  }

  console.log("bucket propiedades-fotos listo (público)");
  process.exit(0);
}

await setupStorage();

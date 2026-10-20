import { NextResponse } from "next/server";

// Revisión rápida después de cada despliegue (y para monitoreo): responde 200 si la app está arriba.
// No toca la base de datos, para que nunca dependa de ella ni la cargue.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true });
}

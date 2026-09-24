import Link from "next/link";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

export default function AdminPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold text-foreground">Administración</h1>
      <p className="text-sm text-muted-foreground">
        Selecciona Propiedades o Brokers en la navegación para empezar.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/propiedades">
          <Card className="transition-colors hover:bg-muted/50">
            <CardContent>
              <CardTitle>Cola de revisión</CardTitle>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/brokers">
          <Card className="transition-colors hover:bg-muted/50">
            <CardContent>
              <CardTitle>Solicitudes de broker</CardTitle>
            </CardContent>
          </Card>
        </Link>
      </div>
    </main>
  );
}

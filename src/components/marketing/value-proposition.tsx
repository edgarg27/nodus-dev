export function ValueProposition() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
        Un marketplace para dos lados
      </h2>
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-lg bg-surface p-6 ring-1 ring-border shadow-sm">
          <h3 className="text-lg font-medium text-text">Para el buscador</h3>
          <p className="text-sm text-text-muted">
            Filtra por tipo (nave industrial, oficina o local comercial) y modalidad (renta, venta o
            desde cero) en San Luis Potosí, Aguascalientes o León, y ubica cada propiedad en un mapa
            interactivo antes de contactar al oferente.
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-lg bg-surface p-6 ring-1 ring-border shadow-sm">
          <h3 className="text-lg font-medium text-text">Para el oferente y el broker</h3>
          <p className="text-sm text-text-muted">
            Publica como oferente directo o como broker afiliado: cada propiedad pasa por revisión
            de un admin antes de ser pública, y los leads que recibes llegan directo a tu panel.
          </p>
        </div>
      </div>
    </section>
  );
}

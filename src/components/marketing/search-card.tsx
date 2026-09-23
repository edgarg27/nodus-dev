export function SearchCard() {
  return (
    <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-sm">
      <h2 className="text-base font-semibold text-text">Busca tu próximo espacio</h2>
      <form action="/buscar" method="get" className="mt-4 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-text-muted" htmlFor="hero-modalidad">
          Modalidad
          <select
            id="hero-modalidad"
            name="modalidad"
            defaultValue=""
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text"
          >
            <option value="">Cualquiera</option>
            <option value="renta">Renta</option>
            <option value="venta">Venta</option>
            <option value="desde_cero">Desde cero</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-muted" htmlFor="hero-estado">
          Plaza
          <select
            id="hero-estado"
            name="estado"
            defaultValue=""
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text"
          >
            <option value="">Cualquiera</option>
            <option value="SLP">San Luis Potosí</option>
            <option value="Aguascalientes">Aguascalientes</option>
            <option value="Leon">León</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-transform duration-150 ease-out hover:-translate-y-0.5"
        >
          Buscar
        </button>
      </form>
    </div>
  );
}

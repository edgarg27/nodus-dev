// @vitest-environment jsdom
import { zodResolver } from "@hookform/resolvers/zod";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";
import { textoARango } from "@/lib/precio-rango";
import { PropertyFormDetailsFields } from "./property-form-details-fields";
import { type PropertyFormValues, propertyFormSchema, textoANumero } from "./property-form-schema";

const VALORES_BASE: PropertyFormValues = {
  tipo: "nave_industrial",
  modalidad: "renta",
  direccion: "Av. Prueba 1",
  lat: 22.15,
  lng: -100.97,
  estado: "SLP",
  ciudad: "San Luis Potosí",
  descripcion: "Descripción de prueba",
  aceptaFinanciamiento: "false",
  moneda: "MXN",
  precioUnidad: "total",
};

function Arnes({
  tipo,
  onEnviar,
}: {
  tipo: PropertyFormValues["tipo"];
  onEnviar: (valores: PropertyFormValues) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: { ...VALORES_BASE, tipo },
  });

  return (
    <form onSubmit={handleSubmit(onEnviar)}>
      <PropertyFormDetailsFields
        register={register}
        errors={errors}
        tipo={tipo}
        modalidad="renta"
      />
      <button type="submit">Enviar</button>
    </form>
  );
}

afterEach(cleanup);

describe("PropertyFormDetailsFields", () => {
  it("muestra los datos de la nave solo cuando el tipo es nave industrial", () => {
    const { unmount } = render(<Arnes tipo="nave_industrial" onEnviar={vi.fn()} />);
    expect(screen.getByLabelText(/Altura libre/)).toBeTruthy();
    expect(screen.getByLabelText(/Andenes/)).toBeTruthy();
    unmount();

    render(<Arnes tipo="oficina" onEnviar={vi.fn()} />);
    expect(screen.queryByLabelText(/Altura libre/)).toBeNull();
    expect(screen.getByLabelText("Renta mensual")).toBeTruthy();
  });

  it("envía precio y medidas como texto, que se convierte a número", async () => {
    const onEnviar = vi.fn();
    render(<Arnes tipo="nave_industrial" onEnviar={onEnviar} />);

    await userEvent.type(screen.getByLabelText("Renta mensual"), "38,000");
    await userEvent.type(screen.getByLabelText(/Superficie construida/), "1856.5");
    await userEvent.type(screen.getByLabelText(/Andenes/), "4");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(onEnviar).toHaveBeenCalledOnce();
    const valores = onEnviar.mock.calls[0]?.[0] as PropertyFormValues;
    expect(textoARango(valores.precio)).toEqual({ desde: 38000, hasta: null });
    expect(textoANumero(valores.superficieConstruidaM2)).toBe(1856.5);
    expect(textoANumero(valores.andenes)).toBe(4);
    expect(textoANumero(valores.banos)).toBeNull();
  });

  it("rechaza un número negativo y un entero con decimales", async () => {
    const onEnviar = vi.fn();
    render(<Arnes tipo="nave_industrial" onEnviar={onEnviar} />);

    await userEvent.type(screen.getByLabelText("Renta mensual"), "-5");
    await userEvent.type(screen.getByLabelText("Baños"), "2.5");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(onEnviar).not.toHaveBeenCalled();
    expect(await screen.findByText("Escribe un número válido")).toBeTruthy();
    expect(screen.getByText("Escribe un número entero")).toBeTruthy();
  });

  it("acepta precio y mantenimiento como rango en la misma casilla", async () => {
    const onEnviar = vi.fn();
    render(<Arnes tipo="oficina" onEnviar={onEnviar} />);

    await userEvent.type(screen.getByLabelText("Renta mensual"), "450 - 1200");
    await userEvent.type(screen.getByLabelText(/Mantenimiento/), "67.5 - 180");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(onEnviar).toHaveBeenCalledOnce();
    const valores = onEnviar.mock.calls[0]?.[0] as PropertyFormValues;
    expect(textoARango(valores.precio)).toEqual({ desde: 450, hasta: 1200 });
    expect(textoARango(valores.mantenimiento)).toEqual({ desde: 67.5, hasta: 180 });
  });
});

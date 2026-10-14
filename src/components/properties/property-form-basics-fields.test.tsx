// @vitest-environment jsdom
import { zodResolver } from "@hookform/resolvers/zod";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PropertyFormBasicsFields } from "./property-form-basics-fields";
import { type PropertyFormValues, propertyFormSchema } from "./property-form-schema";

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
};

function Arnes({
  defaultValues,
  onEnviar,
}: {
  defaultValues?: Partial<PropertyFormValues>;
  onEnviar: (valores: PropertyFormValues) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: { ...VALORES_BASE, ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onEnviar)}>
      <PropertyFormBasicsFields register={register} errors={errors} onSalirDeDireccion={() => {}} />
      <button type="submit">Enviar</button>
    </form>
  );
}

describe("PropertyFormBasicsFields / aceptaFinanciamiento", () => {
  afterEach(() => {
    cleanup();
  });

  it("sin tocar el campo, el envío incluye aceptaFinanciamiento: false", async () => {
    const onEnviar = vi.fn();
    render(<Arnes onEnviar={onEnviar} />);

    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(onEnviar).toHaveBeenCalledTimes(1);
    expect(onEnviar.mock.calls[0]?.[0].aceptaFinanciamiento).toBe("false");
  });

  it("al seleccionar Sí, el envío incluye aceptaFinanciamiento: true", async () => {
    const onEnviar = vi.fn();
    render(<Arnes onEnviar={onEnviar} />);

    await userEvent.click(screen.getByRole("radio", { name: "Sí" }));
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(onEnviar).toHaveBeenCalledTimes(1);
    expect(onEnviar.mock.calls[0]?.[0].aceptaFinanciamiento).toBe("true");
  });

  it("con aceptaFinanciamiento: true existente, pre-selecciona Sí al cargar", () => {
    render(<Arnes defaultValues={{ aceptaFinanciamiento: "true" }} onEnviar={vi.fn()} />);

    const radioSi = screen.getByRole("radio", { name: "Sí" }) as HTMLInputElement;
    const radioNo = screen.getByRole("radio", { name: "No" }) as HTMLInputElement;
    expect(radioSi.checked).toBe(true);
    expect(radioNo.checked).toBe(false);
  });
});

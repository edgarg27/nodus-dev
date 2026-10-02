import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AddressAutocomplete, type Sugerencia } from "./address-autocomplete";
import { inputClassName, type PropertyFormValues, selectClassName } from "./property-form-schema";

interface PropertyFormBasicsFieldsProps {
  register: UseFormRegister<PropertyFormValues>;
  errors: FieldErrors<PropertyFormValues>;
  onSalirDeDireccion: () => void;
  onSeleccionarDireccion: (sugerencia: Sugerencia) => void;
}

export function PropertyFormBasicsFields({
  register,
  errors,
  onSalirDeDireccion,
  onSeleccionarDireccion,
}: PropertyFormBasicsFieldsProps) {
  return (
    <>
      <div className="flex flex-col gap-4">
        <h2 className="text-[15px] font-bold text-foreground">Información básica</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="tipo" className="text-[13px] font-semibold text-foreground">
              Tipo
            </Label>
            <select id="tipo" {...register("tipo")} className={selectClassName}>
              <option value="nave_industrial">Nave industrial</option>
              <option value="oficina">Oficina</option>
              <option value="local_comercial">Local comercial</option>
            </select>
            {errors.tipo ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.tipo.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="modalidad" className="text-[13px] font-semibold text-foreground">
              Modalidad
            </Label>
            <select id="modalidad" {...register("modalidad")} className={selectClassName}>
              <option value="renta">Renta</option>
              <option value="venta">Venta</option>
              <option value="desde_cero">Desde cero</option>
            </select>
            {errors.modalidad ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.modalidad.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="direccion" className="text-[13px] font-semibold text-foreground">
            Dirección
          </Label>
          <AddressAutocomplete
            id="direccion"
            className={inputClassName}
            {...register("direccion", { onBlur: onSalirDeDireccion })}
            aria-invalid={!!errors.direccion}
            onSeleccionar={onSeleccionarDireccion}
          />
          {errors.direccion ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.direccion.message}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="estado" className="text-[13px] font-semibold text-foreground">
              Estado
            </Label>
            <select id="estado" {...register("estado")} className={selectClassName}>
              <option value="SLP">San Luis Potosí</option>
              <option value="Aguascalientes">Aguascalientes</option>
              <option value="Leon">León</option>
            </select>
            {errors.estado ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.estado.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ciudad" className="text-[13px] font-semibold text-foreground">
              Ciudad
            </Label>
            <Input
              id="ciudad"
              className={inputClassName}
              {...register("ciudad")}
              aria-invalid={!!errors.ciudad}
            />
            {errors.ciudad ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.ciudad.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-[13px] font-semibold text-foreground">
            ¿Financiamiento disponible?
          </Label>
          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2 text-[15px] text-foreground">
              <input
                type="radio"
                value="true"
                className="accent-primary"
                {...register("aceptaFinanciamiento")}
              />
              Sí
            </label>
            <label className="flex items-center gap-2 text-[15px] text-foreground">
              <input
                type="radio"
                value="false"
                className="accent-primary"
                {...register("aceptaFinanciamiento")}
              />
              No
            </label>
          </div>
          {errors.aceptaFinanciamiento ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.aceptaFinanciamiento.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-7">
        <h2 className="text-[15px] font-bold text-foreground">Descripción</h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="descripcion" className="text-[13px] font-semibold text-foreground">
            Cuéntale a los buscadores sobre tu espacio
          </Label>
          <Textarea
            id="descripcion"
            rows={5}
            placeholder="Altura libre, andenes de carga, oficinas incluidas, condiciones de acceso, etc."
            className="resize-y rounded-lg border-input bg-background px-3.5 py-3 text-[15px]"
            {...register("descripcion")}
            aria-invalid={!!errors.descripcion}
          />
          {errors.descripcion ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.descripcion.message}
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}

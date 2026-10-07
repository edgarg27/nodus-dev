import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ESTADOS_MX } from "@/lib/estados";
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
  const { t } = useIdioma();
  const f = t.panel.formulario;
  return (
    <>
      <div className="flex flex-col gap-4">
        <h2 className="text-[15px] font-bold text-foreground">{f.infoBasica}</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="tipo" className="text-[13px] font-semibold text-foreground">
              {f.tipo}
            </Label>
            <select id="tipo" {...register("tipo")} className={selectClassName}>
              <option value="nave_industrial">{t.etiquetas.tipo.nave_industrial}</option>
              <option value="oficina">{t.etiquetas.tipo.oficina}</option>
              <option value="local_comercial">{t.etiquetas.tipo.local_comercial}</option>
            </select>
            {errors.tipo ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.tipo.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="modalidad" className="text-[13px] font-semibold text-foreground">
              {f.modalidad}
            </Label>
            <select id="modalidad" {...register("modalidad")} className={selectClassName}>
              <option value="renta">{t.etiquetas.modalidad.renta}</option>
              <option value="venta">{t.etiquetas.modalidad.venta}</option>
              <option value="desde_cero">{f.desdeCero}</option>
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
            {f.direccion}
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
              {f.estado}
            </Label>
            <select id="estado" {...register("estado")} className={selectClassName}>
              {ESTADOS_MX.map((estado) => (
                <option key={estado.codigo} value={estado.codigo}>
                  {estado.nombre}
                </option>
              ))}
            </select>
            {errors.estado ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.estado.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ciudad" className="text-[13px] font-semibold text-foreground">
              {f.ciudad}
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
          <Label className="text-[13px] font-semibold text-foreground">{f.financiamiento}</Label>
          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2 text-[15px] text-foreground">
              <input
                type="radio"
                value="true"
                className="accent-primary"
                {...register("aceptaFinanciamiento")}
              />
              {f.si}
            </label>
            <label className="flex items-center gap-2 text-[15px] text-foreground">
              <input
                type="radio"
                value="false"
                className="accent-primary"
                {...register("aceptaFinanciamiento")}
              />
              {f.no}
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
        <h2 className="text-[15px] font-bold text-foreground">{f.descripcion}</h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="descripcion" className="text-[13px] font-semibold text-foreground">
            {f.cuentale}
          </Label>
          <Textarea
            id="descripcion"
            rows={5}
            placeholder={f.placeholderDescripcion}
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

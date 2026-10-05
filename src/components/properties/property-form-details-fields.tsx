import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inputClassName, type PropertyFormValues, selectClassName } from "./property-form-schema";

type CampoNumerico = Exclude<
  keyof PropertyFormValues,
  | "tipo"
  | "modalidad"
  | "direccion"
  | "lat"
  | "lng"
  | "estado"
  | "ciudad"
  | "descripcion"
  | "aceptaFinanciamiento"
  | "moneda"
  | "precioUnidad"
>;

interface PropertyFormDetailsFieldsProps {
  register: UseFormRegister<PropertyFormValues>;
  errors: FieldErrors<PropertyFormValues>;
  tipo: PropertyFormValues["tipo"] | undefined;
  modalidad: PropertyFormValues["modalidad"] | undefined;
}

function CampoNumero({
  campo,
  etiqueta,
  sufijo,
  register,
  errors,
  decimales = false,
}: {
  campo: CampoNumerico;
  etiqueta: string;
  sufijo?: string;
  register: UseFormRegister<PropertyFormValues>;
  errors: FieldErrors<PropertyFormValues>;
  decimales?: boolean;
}) {
  const error = errors[campo];
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={campo} className="text-[13px] font-semibold text-foreground">
        {etiqueta}
        {sufijo ? <span className="font-normal text-muted-foreground"> ({sufijo})</span> : null}
      </Label>
      <Input
        id={campo}
        inputMode={decimales ? "decimal" : "numeric"}
        autoComplete="off"
        className={inputClassName}
        {...register(campo)}
        aria-invalid={!!error}
      />
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      ) : null}
    </div>
  );
}

export function PropertyFormDetailsFields({
  register,
  errors,
  tipo,
  modalidad,
}: PropertyFormDetailsFieldsProps) {
  const etiquetaPrecio =
    modalidad === "renta" ? "Renta mensual" : modalidad === "venta" ? "Precio de venta" : "Precio";

  return (
    <div className="flex flex-col gap-4 border-t border-border pt-7">
      <div className="flex flex-col gap-1">
        <h2 className="text-[15px] font-bold text-foreground">Precio y medidas</h2>
        <p className="text-[13px] text-muted-foreground">
          Opcionales, pero los espacios con precio y metros reciben más contactos. Sin precio se
          muestra “Precio a consultar”.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1.4fr_0.8fr_1fr]">
        <CampoNumero
          campo="precio"
          etiqueta={etiquetaPrecio}
          register={register}
          errors={errors}
          decimales
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor="moneda" className="text-[13px] font-semibold text-foreground">
            Moneda
          </Label>
          <select id="moneda" {...register("moneda")} className={selectClassName}>
            <option value="MXN">MXN</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="precioUnidad" className="text-[13px] font-semibold text-foreground">
            El precio es
          </Label>
          <select id="precioUnidad" {...register("precioUnidad")} className={selectClassName}>
            <option value="total">Por el espacio completo</option>
            <option value="m2">Por m²</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <CampoNumero
          campo="mantenimiento"
          etiqueta="Mantenimiento"
          sufijo="mensual"
          register={register}
          errors={errors}
          decimales
        />
        <CampoNumero
          campo="superficieConstruidaM2"
          etiqueta="Superficie construida"
          sufijo="m²"
          register={register}
          errors={errors}
          decimales
        />
        <CampoNumero
          campo="superficieTerrenoM2"
          etiqueta="Superficie de terreno"
          sufijo="m²"
          register={register}
          errors={errors}
          decimales
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <CampoNumero campo="banos" etiqueta="Baños" register={register} errors={errors} />
        <CampoNumero
          campo="estacionamientos"
          etiqueta="Estacionamientos"
          register={register}
          errors={errors}
        />
      </div>

      {tipo === "nave_industrial" ? (
        <div className="flex flex-col gap-3 rounded-xl bg-muted/60 p-4">
          <h3 className="text-[13px] font-bold text-foreground">Datos de la nave</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <CampoNumero
              campo="alturaLibreM"
              etiqueta="Altura libre"
              sufijo="m"
              register={register}
              errors={errors}
              decimales
            />
            <CampoNumero campo="andenes" etiqueta="Andenes" register={register} errors={errors} />
            <CampoNumero
              campo="potenciaKva"
              etiqueta="Carga eléctrica"
              sufijo="kVA"
              register={register}
              errors={errors}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

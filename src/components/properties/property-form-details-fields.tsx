import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { useIdioma } from "@/components/i18n/idioma-provider";
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
  | "referencia"
  | "titulo"
  | "contactoId"
  | "compartidaEnRed"
  | "exclusiva"
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
  const f = useIdioma().t.panel.formulario;
  const etiquetaPrecio =
    modalidad === "renta" ? f.rentaMensual : modalidad === "venta" ? f.precioVenta : f.precio;

  return (
    <div className="flex flex-col gap-4 border-t border-border pt-7">
      <div className="flex flex-col gap-1">
        <h2 className="text-[15px] font-bold text-foreground">{f.precioMedidas}</h2>
        <p className="text-[13px] text-muted-foreground">{f.precioMedidasAyuda}</p>
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
            {f.moneda}
          </Label>
          <select id="moneda" {...register("moneda")} className={selectClassName}>
            <option value="MXN">MXN</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="precioUnidad" className="text-[13px] font-semibold text-foreground">
            {f.precioEs}
          </Label>
          <select id="precioUnidad" {...register("precioUnidad")} className={selectClassName}>
            <option value="total">{f.porEspacio}</option>
            <option value="m2">{f.porM2}</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <CampoNumero
          campo="mantenimiento"
          etiqueta={f.mantenimiento}
          sufijo={f.mensual}
          register={register}
          errors={errors}
          decimales
        />
        <CampoNumero
          campo="superficieConstruidaM2"
          etiqueta={f.superficieConstruida}
          sufijo="m²"
          register={register}
          errors={errors}
          decimales
        />
        <CampoNumero
          campo="superficieTerrenoM2"
          etiqueta={f.superficieTerreno}
          sufijo="m²"
          register={register}
          errors={errors}
          decimales
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <CampoNumero campo="banos" etiqueta={f.banos} register={register} errors={errors} />
        <CampoNumero
          campo="estacionamientos"
          etiqueta={f.estacionamientos}
          register={register}
          errors={errors}
        />
      </div>

      {tipo === "nave_industrial" ? (
        <div className="flex flex-col gap-3 rounded-xl bg-muted/60 p-4">
          <h3 className="text-[13px] font-bold text-foreground">{f.datosNave}</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <CampoNumero
              campo="alturaLibreM"
              etiqueta={f.alturaLibre}
              sufijo="m"
              register={register}
              errors={errors}
              decimales
            />
            <CampoNumero campo="andenes" etiqueta={f.andenes} register={register} errors={errors} />
            <CampoNumero
              campo="potenciaKva"
              etiqueta={f.cargaElectrica}
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

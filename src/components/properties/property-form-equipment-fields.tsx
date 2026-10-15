import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { equipamientoDeTipo } from "@/lib/equipamiento";
import { inputClassName, type PropertyFormValues } from "./property-form-schema";

interface PropertyFormEquipmentFieldsProps {
  register: UseFormRegister<PropertyFormValues>;
  errors: FieldErrors<PropertyFormValues>;
  tipo: PropertyFormValues["tipo"] | undefined;
}

type CampoExtra = "oficinasPrivadas" | "frenteM" | "resistenciaPisoTon";

// Sección "Equipamiento" del formulario de publicar: casillas según el tipo de inmueble y los datos
// con número que las acompañan (oficinas privadas, metros de frente, resistencia del piso).
export function PropertyFormEquipmentFields({
  register,
  errors,
  tipo,
}: PropertyFormEquipmentFieldsProps) {
  const { t } = useIdioma();
  const f = t.panel.formulario;
  const e = t.equipamiento;
  if (!tipo) return null;

  const extras: { campo: CampoExtra; etiqueta: string; sufijo?: string; decimales?: boolean }[] = [
    { campo: "oficinasPrivadas", etiqueta: f.oficinasPrivadas },
    ...(tipo === "local_comercial"
      ? [{ campo: "frenteM" as const, etiqueta: f.frenteCalle, sufijo: "m", decimales: true }]
      : []),
    ...(tipo === "nave_industrial"
      ? [
          {
            campo: "resistenciaPisoTon" as const,
            etiqueta: f.resistenciaPiso,
            sufijo: "ton/m²",
            decimales: true,
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4 border-t border-border pt-7">
      <div className="flex flex-col gap-1">
        <h2 className="text-[15px] font-bold text-foreground">{f.equipamientoTitulo}</h2>
        <p className="text-[13px] text-muted-foreground">{f.equipamientoAyuda}</p>
      </div>

      <fieldset className="m-0 grid gap-2 border-0 p-0 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="sr-only">{f.equipamientoTitulo}</legend>
        {equipamientoDeTipo(tipo).map((clave) => (
          <label
            key={clave}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-input px-3 py-2.5 text-sm text-foreground transition-colors hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/5"
          >
            <input
              type="checkbox"
              value={clave}
              {...register("equipamiento")}
              className="size-4 shrink-0 accent-primary"
            />
            {e[clave]}
          </label>
        ))}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        {extras.map(({ campo, etiqueta, sufijo, decimales }) => (
          <div key={campo} className="flex flex-col gap-2">
            <Label htmlFor={campo} className="text-[13px] font-semibold text-foreground">
              {etiqueta}{" "}
              {sufijo ? (
                <span className="font-normal text-muted-foreground">({sufijo})</span>
              ) : null}
            </Label>
            <Input
              id={campo}
              inputMode={decimales ? "decimal" : "numeric"}
              {...register(campo)}
              className={inputClassName}
            />
            {errors[campo]?.message ? (
              <p role="alert" className="text-sm text-destructive">
                {errors[campo]?.message}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

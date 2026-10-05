import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PinPicker } from "../map/pin-picker";
import { inputClassName, type PropertyFormValues } from "./property-form-schema";

interface PropertyFormLocationFieldProps {
  register: UseFormRegister<PropertyFormValues>;
  errors: FieldErrors<PropertyFormValues>;
  lat: number | undefined;
  lng: number | undefined;
  onCoordenadaTocada: () => void;
  onMoverPin: (lat: number, lng: number) => void;
  faltaConfirmar: boolean;
  onConfirmar: () => void;
}

export function PropertyFormLocationField({
  register,
  errors,
  lat,
  lng,
  onCoordenadaTocada,
  onMoverPin,
  faltaConfirmar,
  onConfirmar,
}: PropertyFormLocationFieldProps) {
  return (
    <div className="flex flex-col gap-4 border-t border-border pt-7">
      <h2 className="text-[15px] font-bold text-foreground">Ubicación en el mapa</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="lat" className="text-[13px] font-semibold text-foreground">
            Latitud
          </Label>
          <Input
            id="lat"
            type="number"
            step="any"
            className={inputClassName}
            {...register("lat", { valueAsNumber: true, onChange: onCoordenadaTocada })}
            aria-invalid={!!errors.lat}
          />
          {errors.lat ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.lat.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="lng" className="text-[13px] font-semibold text-foreground">
            Longitud
          </Label>
          <Input
            id="lng"
            type="number"
            step="any"
            className={inputClassName}
            {...register("lng", { valueAsNumber: true, onChange: onCoordenadaTocada })}
            aria-invalid={!!errors.lng}
          />
          {errors.lng ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.lng.message}
            </p>
          ) : null}
        </div>
      </div>

      {faltaConfirmar ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-foreground">
            Ubicamos el pin con tu dirección, pero puede no ser exacto.{" "}
            <strong>Verifica que esté sobre tu propiedad</strong>; si no, arrástralo o haz clic en
            el lugar correcto del mapa.
          </p>
          <Button
            type="button"
            onClick={onConfirmar}
            className="h-10 shrink-0 rounded-lg bg-accent px-4 text-[14px] font-bold text-accent-foreground hover:bg-accent/90"
          >
            Sí, está en el lugar correcto
          </Button>
        </div>
      ) : null}

      <div
        className={`overflow-hidden rounded-lg border ${faltaConfirmar ? "border-warning" : "border-input"}`}
      >
        <PinPicker lat={lat} lng={lng} onChange={onMoverPin} />
      </div>
    </div>
  );
}

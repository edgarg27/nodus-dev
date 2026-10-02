import type { FieldErrors, UseFormRegister } from "react-hook-form";
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
}

export function PropertyFormLocationField({
  register,
  errors,
  lat,
  lng,
  onCoordenadaTocada,
  onMoverPin,
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

      <div className="overflow-hidden rounded-lg border border-input">
        <PinPicker lat={lat} lng={lng} onChange={onMoverPin} />
      </div>
    </div>
  );
}

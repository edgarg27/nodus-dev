import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inputClassName, type PropertyFormValues, selectClassName } from "./property-form-schema";

export interface ContactoOpcion {
  id: string;
  tipo: "email" | "telefono" | "whatsapp";
  valor: string;
}

const ETIQUETA_TIPO_CONTACTO: Record<ContactoOpcion["tipo"], string> = {
  email: "Correo",
  telefono: "Teléfono",
  whatsapp: "WhatsApp",
};

interface PropertyFormNetworkFieldsProps {
  register: UseFormRegister<PropertyFormValues>;
  errors: FieldErrors<PropertyFormValues>;
  contactos: ContactoOpcion[];
  compartidaEnRed: boolean;
}

function MensajeError({ mensaje }: { mensaje: string | undefined }) {
  if (!mensaje) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {mensaje}
    </p>
  );
}

export function PropertyFormNetworkFields({
  register,
  errors,
  contactos,
  compartidaEnRed,
}: PropertyFormNetworkFieldsProps) {
  return (
    <div className="flex flex-col gap-4 border-t border-border pt-7">
      <h2 className="text-[15px] font-bold text-foreground">Identificación y Red inmobiliaria</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="titulo" className="text-[13px] font-semibold text-foreground">
            Título <span className="font-normal text-muted-foreground">(opcional, público)</span>
          </Label>
          <Input
            id="titulo"
            maxLength={160}
            {...register("titulo")}
            className={inputClassName}
            placeholder="Nave con andenes cerca del aeropuerto"
          />
          <MensajeError mensaje={errors.titulo?.message} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="referencia" className="text-[13px] font-semibold text-foreground">
            Referencia{" "}
            <span className="font-normal text-muted-foreground">(opcional, interna)</span>
          </Label>
          <Input
            id="referencia"
            maxLength={60}
            {...register("referencia")}
            className={inputClassName}
            placeholder="NAVE-SLP-014"
          />
          <MensajeError mensaje={errors.referencia?.message} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="contactoId" className="text-[13px] font-semibold text-foreground">
          Contacto para esta propiedad
        </Label>
        <select id="contactoId" {...register("contactoId")} className={selectClassName}>
          <option value="">Mi contacto de cuenta</option>
          {contactos.map((contacto) => (
            <option key={contacto.id} value={contacto.id}>
              {ETIQUETA_TIPO_CONTACTO[contacto.tipo]}: {contacto.valor}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Administra tus correos, teléfonos y WhatsApp en el perfil de tu agencia.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="compartidaEnRed" className="text-[13px] font-semibold text-foreground">
            Compartir en la Red inmobiliaria
          </Label>
          <select id="compartidaEnRed" {...register("compartidaEnRed")} className={selectClassName}>
            <option value="false">No compartir</option>
            <option value="true">Compartir con otros oferentes</option>
          </select>
        </div>

        {compartidaEnRed ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="comisionPct" className="text-[13px] font-semibold text-foreground">
              Comisión que compartes <span className="font-normal text-muted-foreground">(%)</span>
            </Label>
            <Input
              id="comisionPct"
              inputMode="decimal"
              {...register("comisionPct")}
              className={inputClassName}
              placeholder="50"
            />
            <MensajeError mensaje={errors.comisionPct?.message} />
          </div>
        ) : null}
      </div>

      {compartidaEnRed ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="exclusiva" className="text-[13px] font-semibold text-foreground">
            ¿Manejas este espacio en exclusiva?
          </Label>
          <select id="exclusiva" {...register("exclusiva")} className={selectClassName}>
            <option value="false">No</option>
            <option value="true">Sí, en exclusiva</option>
          </select>
          <p className="text-xs text-muted-foreground">
            La comisión solo la ven otros oferentes en la Red; nunca aparece en la ficha pública.
          </p>
        </div>
      ) : null}
    </div>
  );
}

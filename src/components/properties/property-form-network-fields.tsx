import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inputClassName, type PropertyFormValues, selectClassName } from "./property-form-schema";

export interface ContactoOpcion {
  id: string;
  tipo: "email" | "telefono" | "whatsapp";
  valor: string;
}

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
  const { t } = useIdioma();
  const f = t.panel.formulario;
  return (
    <div className="flex flex-col gap-4 border-t border-border pt-7">
      <h2 className="text-[15px] font-bold text-foreground">{f.redTitulo}</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="titulo" className="text-[13px] font-semibold text-foreground">
            {f.titulo}{" "}
            <span className="font-normal text-muted-foreground">{f.opcionalPublico}</span>
          </Label>
          <Input
            id="titulo"
            maxLength={160}
            {...register("titulo")}
            className={inputClassName}
            placeholder={f.placeholderTitulo}
          />
          <MensajeError mensaje={errors.titulo?.message} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="referencia" className="text-[13px] font-semibold text-foreground">
            {f.referencia}{" "}
            <span className="font-normal text-muted-foreground">{f.opcionalInterna}</span>
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
          {f.contacto}
        </Label>
        <select id="contactoId" {...register("contactoId")} className={selectClassName}>
          <option value="">{f.miContacto}</option>
          {contactos.map((contacto) => (
            <option key={contacto.id} value={contacto.id}>
              {t.panel.agencia.tipoContacto[contacto.tipo]}: {contacto.valor}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">{f.contactosAyuda}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="compartidaEnRed" className="text-[13px] font-semibold text-foreground">
            {f.compartir}
          </Label>
          <select id="compartidaEnRed" {...register("compartidaEnRed")} className={selectClassName}>
            <option value="false">{f.noCompartir}</option>
            <option value="true">{f.compartirOtros}</option>
          </select>
        </div>

        {compartidaEnRed ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="comisionPct" className="text-[13px] font-semibold text-foreground">
              {f.comision} <span className="font-normal text-muted-foreground">(%)</span>
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
            {f.exclusiva}
          </Label>
          <select id="exclusiva" {...register("exclusiva")} className={selectClassName}>
            <option value="false">{f.no}</option>
            <option value="true">{f.siExclusiva}</option>
          </select>
          <p className="text-xs text-muted-foreground">{f.comisionAyuda}</p>
        </div>
      ) : null}
    </div>
  );
}

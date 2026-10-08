import { iniciales } from "@/lib/initials";
import { cn } from "@/lib/utils";

interface AgencyAvatarProps {
  nombre: string;
  logoUrl: string | null;
  className?: string;
}

// Logo de la agencia o, si no subió uno, sus iniciales. Decorativo: el nombre siempre va al lado.
export function AgencyAvatar({ nombre, logoUrl, className }: AgencyAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary font-display font-bold text-primary-foreground",
        className,
      )}
    >
      {logoUrl ? (
        // biome-ignore lint/performance/noImgElement: logo subido por el oferente
        <img src={logoUrl} alt="" className="h-full w-full bg-white object-contain" />
      ) : (
        iniciales(nombre) || "?"
      )}
    </span>
  );
}

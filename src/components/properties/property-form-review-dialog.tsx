import { useIdioma } from "@/components/i18n/idioma-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PropertyFormReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmar: () => void;
}

// Aviso antes de guardar cambios en una propiedad `publicada`: el guardado la devuelve a revisión
// y deja de verse en la búsqueda hasta que un administrador la apruebe de nuevo.
export function PropertyFormReviewDialog({
  open,
  onOpenChange,
  onConfirmar,
}: PropertyFormReviewDialogProps) {
  const f = useIdioma().t.panel.formulario;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 rounded-2xl border border-border bg-surface p-6 sm:max-w-md">
        <DialogHeader className="gap-2 pr-6">
          <DialogTitle className="font-display text-xl font-bold text-foreground">
            {f.revisionTitulo}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            {f.revisionAntes} <strong className="text-foreground">{f.publicada}</strong>
            {f.revisionMedio} <strong className="text-warning">{f.pendiente}</strong>{" "}
            {f.revisionDespues}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mx-0 mb-0 gap-2 border-0 bg-transparent p-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11 rounded-lg border-input px-5 font-bold"
          >
            {f.cancelar}
          </Button>
          <Button
            type="button"
            onClick={onConfirmar}
            className="h-11 rounded-lg bg-accent px-5 font-bold text-accent-foreground hover:bg-accent/90"
          >
            {f.siEnviar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

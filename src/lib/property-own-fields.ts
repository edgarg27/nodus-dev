import { z } from "zod";

// Campos propios del oferente (identificación y Red inmobiliaria). Fuente única para las rutas
// de crear y editar propiedad. Nulo borra el valor; omitirlo lo deja como está.
export const camposPropiosSchema = z.object({
  referencia: z.string().trim().min(1).max(60).nullable().optional(),
  titulo: z.string().trim().min(1).max(160).nullable().optional(),
  contactoId: z.uuid().nullable().optional(),
  compartidaEnRed: z.boolean().optional(),
  comisionPct: z.number().min(0).max(100).nullable().optional(),
  exclusiva: z.boolean().optional(),
});

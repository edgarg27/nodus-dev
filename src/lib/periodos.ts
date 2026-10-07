// Periodos de las métricas del panel del oferente (en días).
export const PERIODOS_DIAS = [7, 30, 90] as const;
export type PeriodoDias = (typeof PERIODOS_DIAS)[number];

// Un valor inválido en la URL se ignora y se usa el de 30 días.
export function periodoValido(valor: unknown): PeriodoDias {
  const dias = Number(valor);
  return (PERIODOS_DIAS as readonly number[]).includes(dias) ? (dias as PeriodoDias) : 30;
}

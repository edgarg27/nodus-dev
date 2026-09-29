export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  const letras = partes.length > 1 ? [partes[0], partes[partes.length - 1]] : [partes[0]];
  return letras
    .map((parte) => parte?.[0] ?? "")
    .join("")
    .toUpperCase();
}

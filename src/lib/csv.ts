// CSV para las exportaciones del oferente. Neutraliza las celdas que una hoja de cálculo
// interpretaría como fórmula (empiezan con =, +, - o @) anteponiendo una comilla simple.

export type CeldaCsv = string | number | boolean | null | undefined;

const PREFIJOS_FORMULA = ["=", "+", "-", "@", "\t", "\r"];

function neutralizar(texto: string): string {
  const primero = texto[0];
  return primero !== undefined && PREFIJOS_FORMULA.includes(primero) ? `'${texto}` : texto;
}

export function celdaCsv(valor: CeldaCsv): string {
  if (valor === null || valor === undefined) return "";
  // Los números reales no se neutralizan: un "-5" numérico no es una fórmula.
  const texto = typeof valor === "number" ? String(valor) : neutralizar(String(valor));
  return /[",\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

// BOM al inicio para que Excel abra el UTF-8 con acentos; saltos de línea CRLF.
export function aCsv(encabezados: string[], filas: CeldaCsv[][]): string {
  const lineas = [encabezados, ...filas].map((fila) => fila.map(celdaCsv).join(","));
  return `﻿${lineas.join("\r\n")}\r\n`;
}

export function respuestaCsv(nombreArchivo: string, contenido: string): Response {
  return new Response(contenido, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      "Cache-Control": "no-store",
    },
  });
}

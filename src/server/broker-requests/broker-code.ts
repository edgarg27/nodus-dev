import { randomInt } from "node:crypto";

// Alfabeto sin ambiguos: sin I/O/0/1. 32 símbolos.
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LONGITUD_CODIGO = 6;

export function generarBrokerCode(): string {
  let codigo = "";
  for (let i = 0; i < LONGITUD_CODIGO; i++) {
    codigo += ALFABETO[randomInt(ALFABETO.length)];
  }
  return `BRK-${codigo}`;
}

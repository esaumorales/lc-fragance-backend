import { createHash, randomInt, timingSafeEqual } from "crypto";

export const LARGO_DEL_CODIGO = 6;
export const MINUTOS_DE_VIGENCIA = 10;
export const INTENTOS_MAXIMOS = 5;

// randomInt usa el generador criptografico; Math.random es predecible y un
// codigo adivinable deja entrar a cualquiera.
export function generarCodigo(): string {
  return String(randomInt(0, 10 ** LARGO_DEL_CODIGO)).padStart(LARGO_DEL_CODIGO, "0");
}

// Se guarda el hash y no el codigo, igual que con los refresh tokens.
export function hashearCodigo(codigo: string): string {
  return createHash("sha256").update(codigo.trim()).digest("hex");
}

// Comparacion de tiempo constante: comparar con === filtra, por la diferencia
// de tiempo, cuantos caracteres iniciales acerto quien esta probando.
export function codigoCoincide(codigo: string, hashGuardado: string): boolean {
  const calculado = Buffer.from(hashearCodigo(codigo), "hex");
  const guardado = Buffer.from(hashGuardado, "hex");
  if (calculado.length !== guardado.length) {
    return false;
  }
  return timingSafeEqual(calculado, guardado);
}

export function vencimientoDelCodigo(desde = new Date()): Date {
  return new Date(desde.getTime() + MINUTOS_DE_VIGENCIA * 60 * 1000);
}

type Desafio = {
  codeHash: string;
  attempts: number;
  usedAt: Date | null;
  expiresAt: Date;
};

export type ResultadoDeVerificacion =
  | { valido: true }
  | { valido: false; motivo: "usado" | "vencido" | "sin-intentos" | "incorrecto" };

// Decide si un codigo entregado sirve. Es pura para poder probar cada rechazo
// sin base de datos.
export function verificarCodigo(desafio: Desafio, codigo: string, ahora = new Date()): ResultadoDeVerificacion {
  if (desafio.usedAt) {
    return { valido: false, motivo: "usado" };
  }
  if (desafio.expiresAt <= ahora) {
    return { valido: false, motivo: "vencido" };
  }
  if (desafio.attempts >= INTENTOS_MAXIMOS) {
    return { valido: false, motivo: "sin-intentos" };
  }
  if (!codigoCoincide(codigo, desafio.codeHash)) {
    return { valido: false, motivo: "incorrecto" };
  }
  return { valido: true };
}

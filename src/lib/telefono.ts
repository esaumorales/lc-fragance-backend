// El telefono, listo para un enlace de WhatsApp.

/**
 * Lo minimo para que wa.me encuentre a alguien.
 *
 * wa.me necesita el numero internacional: codigo de pais mas el local, sin
 * el "+". Un movil peruano son 9 digitos, asi que exigir 10 obliga a poner
 * el codigo y atrapa justo el error mas facil de cometer.
 */
export const MINIMO_DIGITOS = 10;

/** Deja solo digitos: wa.me no acepta espacios, guiones ni parentesis. */
export function soloDigitos(valor: string | null | undefined): string {
  return valor ? valor.replace(/\D/g, "") : "";
}

/**
 * El numero listo para el enlace, o null si no sirve.
 *
 * Devolver null es a proposito: sin numero valido no se dibuja el boton, y
 * eso es mejor que uno que abre un chat con nadie.
 */
export function normalizarTelefono(valor: string | null | undefined): string | null {
  const digitos = soloDigitos(valor);
  return digitos.length >= MINIMO_DIGITOS ? digitos : null;
}

/** Que le falta al numero, en palabras. Null si esta bien. */
export function motivoDelTelefono(valor: string | null | undefined): string | null {
  const digitos = soloDigitos(valor);
  if (digitos.length === 0) return null;

  if (digitos.length < MINIMO_DIGITOS) {
    return "Falta el código del país. Por ejemplo: +51 974 732 528";
  }
  if (digitos.length > 15) {
    return "Ese número tiene demasiados dígitos";
  }
  return null;
}

// El telefono, listo para un enlace de WhatsApp.

/**
 * Deja solo digitos.
 *
 * wa.me no acepta espacios, guiones ni parentesis, y el numero se escribe a
 * mano en el panel: va a venir con el formato que a cada uno le salga.
 */
export function normalizarTelefono(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const digitos = valor.replace(/\D/g, "");
  return digitos.length >= 8 ? digitos : null;
}

// A que numero escribe quien compra.

export type CandidatoDeContacto = {
  role: "ADMIN" | "SUPERADMIN" | "CUSTOMER";
  createdAt: Date;
  telefono: string | null;
};

/** Deja solo digitos: wa.me no acepta espacios, guiones ni parentesis. */
export function normalizarTelefono(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const digitos = valor.replace(/\D/g, "");
  return digitos.length >= 8 ? digitos : null;
}

/**
 * El telefono de quien atiende, sacado de los perfiles del panel.
 *
 * Manda el dueño antes que un administrador, y entre pares el de la cuenta
 * mas vieja: tiene que dar el mismo resultado en cada pedido, no uno al azar.
 * Se permite que dos personas tengan el mismo numero; no es un identificador.
 */
export function telefonoDeContacto(
  candidatos: readonly CandidatoDeContacto[],
  deRespaldo: string | null = null
): string | null {
  const conNumero = candidatos
    .filter((c) => c.role !== "CUSTOMER" && normalizarTelefono(c.telefono))
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === "SUPERADMIN" ? -1 : 1;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

  // Sin ningun perfil cargado se cae al numero de configuracion: el boton de
  // WhatsApp no puede desaparecer porque nadie completo su perfil todavia.
  return normalizarTelefono(conNumero[0]?.telefono) ?? normalizarTelefono(deRespaldo);
}

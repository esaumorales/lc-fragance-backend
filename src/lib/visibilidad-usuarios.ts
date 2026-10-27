import type { Role } from "@prisma/client";

// Que cuentas puede mirar cada rol en el panel.

/**
 * Un administrador solo ve a sus pares.
 *
 * No ve clientes (los datos de una persona que compra no hacen falta para
 * administrar el catalogo) ni superadministradores (quien manda no se expone
 * a quien no manda). El dueño ve todo.
 */
export function rolesVisiblesPara(rol: Role): Role[] {
  return rol === "SUPERADMIN" ? ["CUSTOMER", "ADMIN", "SUPERADMIN"] : ["ADMIN"];
}

/**
 * El filtro que de verdad se aplica, cruzando el pedido con lo permitido.
 *
 * Devuelve siempre una lista: asi el repositorio filtra igual aunque nadie
 * haya pedido un rol, y un administrador no puede ampliar lo que ve tocando
 * la query.
 */
export function filtroDeRoles(rolDelActor: Role, rolPedido?: Role): Role[] {
  const permitidos = rolesVisiblesPara(rolDelActor);
  if (!rolPedido) return permitidos;
  return permitidos.includes(rolPedido) ? [rolPedido] : [];
}

/** Si el actor puede siquiera mirar una cuenta con ese rol. */
export function puedeVerRol(rolDelActor: Role, rolObjetivo: Role): boolean {
  return rolesVisiblesPara(rolDelActor).includes(rolObjetivo);
}

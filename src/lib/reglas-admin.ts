import type { Role } from "@prisma/client";

export type AdminObjetivo = {
  id: string;
  role: Role;
  isActive: boolean;
};

export type Cambios = {
  role?: Role;
  isActive?: boolean;
};

export type Veredicto = { permitido: true } | { permitido: false; motivo: string };

const PERMITIDO: Veredicto = { permitido: true };

// Deja de ser superadministrador activo: lo degradan o lo suspenden.
function pierdeElMando(objetivo: AdminObjetivo, cambios: Cambios): boolean {
  if (objetivo.role !== "SUPERADMIN" || !objetivo.isActive) {
    return false;
  }
  const loDegradan = cambios.role !== undefined && cambios.role !== "SUPERADMIN";
  const loSuspenden = cambios.isActive === false;
  return loDegradan || loSuspenden;
}

/**
 * Decide si un superadministrador puede modificar a otra cuenta del panel.
 *
 * Son reglas puras para poder probar cada rechazo sin base de datos; quien
 * llama aporta cuantos superadministradores activos quedan.
 */
export function puedeActualizar(
  actorId: string,
  objetivo: AdminObjetivo,
  cambios: Cambios,
  superadminsActivos: number
): Veredicto {
  if (cambios.isActive === false && objetivo.id === actorId) {
    return { permitido: false, motivo: "No podés suspender tu propia cuenta" };
  }

  if (cambios.role !== undefined && cambios.role !== "SUPERADMIN" && objetivo.id === actorId) {
    return { permitido: false, motivo: "No podés quitarte a vos mismo el rol de superadministrador" };
  }

  // Sin superadministradores activos nadie podria volver a dar de alta a nadie.
  if (pierdeElMando(objetivo, cambios) && superadminsActivos <= 1) {
    return { permitido: false, motivo: "Es el único superadministrador activo que queda" };
  }

  return PERMITIDO;
}

export function puedeEliminar(
  actorId: string,
  objetivo: AdminObjetivo,
  superadminsActivos: number
): Veredicto {
  if (objetivo.id === actorId) {
    return { permitido: false, motivo: "No podés eliminar tu propia cuenta" };
  }

  if (objetivo.role === "SUPERADMIN" && objetivo.isActive && superadminsActivos <= 1) {
    return { permitido: false, motivo: "Es el único superadministrador activo que queda" };
  }

  return PERMITIDO;
}

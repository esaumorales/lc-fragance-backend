import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Nunca se devuelve el hash de la contraseña hacia afuera.
const CAMPOS_PUBLICOS = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

const ROLES_DEL_PANEL: Role[] = ["ADMIN", "SUPERADMIN"];

export const adminUserRepository = {
  listar() {
    return prisma.user.findMany({
      where: { role: { in: ROLES_DEL_PANEL } },
      select: CAMPOS_PUBLICOS,
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });
  },

  buscarPorId(id: string) {
    return prisma.user.findUnique({ where: { id }, select: CAMPOS_PUBLICOS });
  },

  buscarPorEmail(email: string) {
    return prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  },

  crear(data: { name: string; email: string; role: Role; password: string }) {
    return prisma.user.create({ data, select: CAMPOS_PUBLICOS });
  },

  actualizar(id: string, data: { name?: string; role?: Role; isActive?: boolean }) {
    return prisma.user.update({ where: { id }, data, select: CAMPOS_PUBLICOS });
  },

  eliminar(id: string) {
    return prisma.user.delete({ where: { id } });
  },

  // Para no quedarse sin dueño: se usa antes de degradar, suspender o borrar.
  contarSuperadminsActivos() {
    return prisma.user.count({ where: { role: "SUPERADMIN", isActive: true } });
  },
};

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

// La direccion es de solo lectura para el panel: sirve para coordinar envios.
const CON_DIRECCION = {
  ...CAMPOS_PUBLICOS,
  address: {
    select: {
      recipient: true,
      phone: true,
      street: true,
      reference: true,
      district: true,
      city: true,
      region: true,
      postalCode: true,
    },
  },
} satisfies Prisma.UserSelect;

export const adminUserRepository = {
  listar(rol?: Role) {
    return prisma.user.findMany({
      where: rol ? { role: rol } : undefined,
      select: CON_DIRECCION,
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });
  },

  // Para el resumen: cuantos hay de cada rol.
  async contarPorRol() {
    const filas = await prisma.user.groupBy({ by: ["role"], _count: { _all: true } });
    const conteo: Record<string, number> = { CUSTOMER: 0, ADMIN: 0, SUPERADMIN: 0 };
    for (const fila of filas) {
      conteo[fila.role] = fila._count._all;
    }
    return { total: Object.values(conteo).reduce((a, b) => a + b, 0), porRol: conteo };
  },

  buscarPorId(id: string) {
    return prisma.user.findUnique({ where: { id }, select: CON_DIRECCION });
  },

  buscarPorEmail(email: string) {
    return prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  },

  crear(data: { name: string; email: string; role: Role; password: string }) {
    return prisma.user.create({ data, select: CON_DIRECCION });
  },

  actualizar(id: string, data: { name?: string; email?: string; role?: Role; isActive?: boolean }) {
    return prisma.user.update({ where: { id }, data, select: CON_DIRECCION });
  },

  eliminar(id: string) {
    return prisma.user.delete({ where: { id } });
  },

  // Para no quedarse sin dueño: se usa antes de degradar, suspender o borrar.
  contarSuperadminsActivos() {
    return prisma.user.count({ where: { role: "SUPERADMIN", isActive: true } });
  },
};

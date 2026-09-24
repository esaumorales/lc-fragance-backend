import type { CodePurpose, LinkPurpose, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { RegisterInput } from "@/schemas/auth.schema";

export const authRepository = {
  findUserByEmail(email: string) {
    return prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  },

  findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  createUser(data: RegisterInput & { password: string }) {
    return prisma.user.create({
      data: { name: data.name, email: data.email, password: data.password },
    });
  },

  storeRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    return prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  },

  findRefreshToken(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },

  revokeRefreshToken(tokenHash: string) {
    return prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  // Cerrar todas las sesiones: al suspender a alguien o al cambiar su clave.
  revokeAllRefreshTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  findAddress(userId: string) {
    return prisma.address.findUnique({ where: { userId } });
  },

  // Upsert: la cuenta tiene una sola direccion, se crea o se reemplaza.
  upsertAddress(userId: string, data: Prisma.AddressUncheckedCreateInput) {
    const { userId: _ignorado, ...campos } = data;
    return prisma.address.upsert({
      where: { userId },
      create: { ...campos, userId },
      update: campos,
    });
  },

  deleteAddress(userId: string) {
    return prisma.address.deleteMany({ where: { userId } });
  },

  updateProfile(userId: string, data: { name?: string; email?: string }) {
    return prisma.user.update({ where: { id: userId }, data });
  },

  updatePassword(userId: string, password: string) {
    return prisma.user.update({ where: { id: userId }, data: { password } });
  },

  /**
   * Crea un codigo y anula los anteriores del mismo proposito.
   *
   * Se anulan solo los del mismo proposito: pedir una confirmacion de accion
   * no tiene por que invalidar un codigo de ingreso a medio usar.
   */
  async createVerificationCode(
    userId: string,
    codeHash: string,
    expiresAt: Date,
    purpose: CodePurpose = "LOGIN"
  ) {
    await prisma.verificationCode.updateMany({
      where: { userId, purpose, usedAt: null },
      data: { usedAt: new Date() },
    });
    return prisma.verificationCode.create({ data: { userId, codeHash, expiresAt, purpose } });
  },

  findVerificationCode(id: string) {
    return prisma.verificationCode.findUnique({ where: { id }, include: { user: true } });
  },

  registerFailedAttempt(id: string) {
    return prisma.verificationCode.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  },

  markCodeUsed(id: string) {
    return prisma.verificationCode.update({ where: { id }, data: { usedAt: new Date() } });
  },

  createAccessLink(userId: string, tokenHash: string, purpose: LinkPurpose, expiresAt: Date) {
    return prisma.accessLink.create({ data: { userId, tokenHash, purpose, expiresAt } });
  },

  findAccessLink(tokenHash: string) {
    return prisma.accessLink.findUnique({ where: { tokenHash }, include: { user: true } });
  },

  markLinkUsed(id: string) {
    return prisma.accessLink.update({ where: { id }, data: { usedAt: new Date() } });
  },
};


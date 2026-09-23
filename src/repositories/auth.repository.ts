import type { LinkPurpose } from "@prisma/client";
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

  updatePassword(userId: string, password: string) {
    return prisma.user.update({ where: { id: userId }, data: { password } });
  },

  // Un codigo nuevo anula los anteriores: si no, los viejos siguen sirviendo.
  async createVerificationCode(userId: string, codeHash: string, expiresAt: Date) {
    await prisma.verificationCode.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
    return prisma.verificationCode.create({ data: { userId, codeHash, expiresAt } });
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


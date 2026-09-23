import argon2 from "argon2";
import { authRepository } from "@/repositories/auth.repository";
import type { LoginInput, RegisterInput } from "@/schemas/auth.schema";
import { ApiError } from "@/middlewares/error-handler";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/jwt";
import { sha256Hex } from "@/lib/hash";
import { parseDurationMs } from "@/lib/duration";
import { env } from "@/config/env";

type AuthUser = { id: string; name: string; email: string; role: "CUSTOMER" | "ADMIN" };

async function issueTokens(user: AuthUser) {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id });

  const expiresAt = new Date(Date.now() + parseDurationMs(env.jwt.refreshExpiresIn));
  await authRepository.storeRefreshToken(user.id, sha256Hex(refreshToken), expiresAt);

  return { accessToken, refreshToken };
}

function toAuthUser(user: { id: string; name: string; email: string; role: "CUSTOMER" | "ADMIN" }): AuthUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export const authService = {
  async register(data: RegisterInput) {
    const existing = await authRepository.findUserByEmail(data.email);
    if (existing) {
      throw new ApiError(409, "Ya existe una cuenta con ese correo");
    }

    const passwordHash = await argon2.hash(data.password);
    const user = await authRepository.createUser({ ...data, password: passwordHash });

    const tokens = await issueTokens(toAuthUser(user));
    return { ...tokens, user: toAuthUser(user) };
  },

  async login(data: LoginInput) {
    const user = await authRepository.findUserByEmail(data.email);
    if (!user) {
      throw new ApiError(401, "Credenciales inválidas");
    }

    const valid = await argon2.verify(user.password, data.password);
    if (!valid) {
      throw new ApiError(401, "Credenciales inválidas");
    }

    const tokens = await issueTokens(toAuthUser(user));
    return { ...tokens, user: toAuthUser(user) };
  },

  async refresh(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new ApiError(401, "Refresh token inválido");
    }

    const tokenHash = sha256Hex(refreshToken);
    const stored = await authRepository.findRefreshToken(tokenHash);

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new ApiError(401, "Refresh token inválido o expirado");
    }

    const user = await authRepository.findUserById(payload.sub);
    if (!user) {
      throw new ApiError(401, "Usuario no encontrado");
    }

    // Rotación: se revoca el token usado y se emite uno nuevo.
    await authRepository.revokeRefreshToken(tokenHash);
    const tokens = await issueTokens(toAuthUser(user));
    return { ...tokens, user: toAuthUser(user) };
  },

  async logout(refreshToken: string) {
    await authRepository.revokeRefreshToken(sha256Hex(refreshToken));
  },
};

import type { Role } from "@prisma/client";
import jwt, { type SignOptions } from "jsonwebtoken";
import { randomUUID } from "crypto";
import { env } from "@/config/env";

export type AccessTokenPayload = {
  sub: string; // userId
  role: Role;
};

// El tiempo de expiracion llega del entorno como string ("15m", "7d"), pero
// jsonwebtoken lo tipa como una union literal. La conversion va en un solo
// lugar en vez de repetir el cast en cada firma.
const accessExpiry = env.jwt.accessExpiresIn as SignOptions["expiresIn"];
const refreshExpiry = env.jwt.refreshExpiresIn as SignOptions["expiresIn"];

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, { expiresIn: accessExpiry });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
}

export function signRefreshToken(payload: { sub: string }): string {
  // jti único: sin esto, dos refresh tokens emitidos el mismo segundo para
  // el mismo usuario son JWT idénticos (jsonwebtoken firma con iat en
  // segundos), lo que choca contra el unique de tokenHash en DB.
  return jwt.sign({ ...payload, jti: randomUUID() }, env.jwt.refreshSecret, {
    expiresIn: refreshExpiry,
  });
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, env.jwt.refreshSecret) as { sub: string };
}

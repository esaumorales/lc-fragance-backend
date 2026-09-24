import argon2 from "argon2";
import { randomBytes } from "crypto";
import type { Role } from "@prisma/client";
import { authRepository } from "@/repositories/auth.repository";
import type {
  ActualizarPerfilInput,
  CambiarClaveInput,
  DireccionInput,
  LoginInput,
  RegisterInput,
  RestablecerInput,
  VerificarCodigoInput,
} from "@/schemas/auth.schema";
import { ApiError } from "@/middlewares/error-handler";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/jwt";
import { sha256Hex } from "@/lib/hash";
import { parseDurationMs } from "@/lib/duration";
import { env } from "@/config/env";
import {
  MINUTOS_DE_VIGENCIA,
  generarCodigo,
  hashearCodigo,
  vencimientoDelCodigo,
  verificarCodigo,
} from "@/lib/codigo-verificacion";
import { emailService, plantillas } from "@/services/email.service";

type AuthUser = { id: string; name: string; email: string; role: Role };

export const HORAS_DEL_ENLACE = 24;

// Los roles con acceso al panel piden el codigo por correo; un cliente que solo
// compra no tiene por que pasar por eso.
function necesitaSegundoFactor(role: Role): boolean {
  return role === "ADMIN" || role === "SUPERADMIN";
}

async function issueTokens(user: AuthUser) {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id });

  const expiresAt = new Date(Date.now() + parseDurationMs(env.jwt.refreshExpiresIn));
  await authRepository.storeRefreshToken(user.id, sha256Hex(refreshToken), expiresAt);

  return { accessToken, refreshToken };
}

function toAuthUser(user: { id: string; name: string; email: string; role: Role }): AuthUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function vencimientoDelEnlace(): Date {
  return new Date(Date.now() + HORAS_DEL_ENLACE * 60 * 60 * 1000);
}

// El token viaja en la URL y de el solo se guarda el hash, como los refresh.
export function generarTokenDeEnlace(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: sha256Hex(token) };
}

export function armarUrlDeEnlace(token: string, ruta: "invitacion" | "restablecer"): string {
  const base = env.clientUrls[0] ?? "http://localhost:3000";
  return `${base}/${ruta}?token=${token}`;
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

    // Se comprueba despues de la contraseña: antes, el mensaje le revelaria a
    // cualquiera que prueba correos cuales existen.
    if (!user.isActive) {
      throw new ApiError(403, "La cuenta está suspendida");
    }

    if (necesitaSegundoFactor(user.role)) {
      const codigo = generarCodigo();
      const desafio = await authRepository.createVerificationCode(
        user.id,
        hashearCodigo(codigo),
        vencimientoDelCodigo()
      );

      const envio = await emailService.enviar({
        para: user.email,
        asunto: `Tu código de acceso: ${codigo}`,
        html: plantillas.codigoDeAcceso(user.name, codigo, MINUTOS_DE_VIGENCIA),
      });

      // Sin correo configurado nadie podria entrar al panel nunca mas. El
      // codigo queda en el log del servidor, al que solo llega quien ya tiene
      // acceso a la maquina. En cuanto el correo funcione, deja de escribirse.
      if (!envio.enviado) {
        console.warn(
          `[segundo factor] no se pudo enviar el correo (${envio.motivo}). ` +
            `Código para ${user.email}: ${codigo}`
        );
      }

      return {
        requiereCodigo: true as const,
        desafioId: desafio.id,
        correoEnviado: envio.enviado,
      };
    }

    const tokens = await issueTokens(toAuthUser(user));
    return { ...tokens, user: toAuthUser(user) };
  },

  async verificarSegundoFactor(data: VerificarCodigoInput) {
    const desafio = await authRepository.findVerificationCode(data.desafioId);
    if (!desafio) {
      throw new ApiError(401, "Código inválido");
    }

    const resultado = verificarCodigo(desafio, data.codigo);
    if (!resultado.valido) {
      // Solo suma intento el codigo equivocado: los demas rechazos ya son
      // definitivos y contarlos no cambia nada.
      if (resultado.motivo === "incorrecto") {
        await authRepository.registerFailedAttempt(desafio.id);
      }
      const mensajes = {
        usado: "Ese código ya se usó",
        vencido: "El código venció, pedí uno nuevo",
        "sin-intentos": "Demasiados intentos, pedí un código nuevo",
        incorrecto: "Código inválido",
      };
      throw new ApiError(401, mensajes[resultado.motivo]);
    }

    await authRepository.markCodeUsed(desafio.id);

    if (!desafio.user.isActive) {
      throw new ApiError(403, "La cuenta está suspendida");
    }

    const tokens = await issueTokens(toAuthUser(desafio.user));
    return { ...tokens, user: toAuthUser(desafio.user) };
  },

  // Responde lo mismo exista o no la cuenta: si no, sirve para averiguar que
  // correos estan registrados.
  async olvideContrasena(email: string) {
    const user = await authRepository.findUserByEmail(email);
    if (!user || !user.isActive) {
      return { enviado: false };
    }

    const { token, tokenHash } = generarTokenDeEnlace();
    await authRepository.createAccessLink(user.id, tokenHash, "RESET", vencimientoDelEnlace());

    const envio = await emailService.enviar({
      para: user.email,
      asunto: "Restablecer tu contraseña",
      html: plantillas.restablecer(
        user.name,
        armarUrlDeEnlace(token, "restablecer"),
        HORAS_DEL_ENLACE
      ),
    });

    // Quien lo pide recibe siempre la misma respuesta, asi que un fallo de
    // envio seria invisible: queda anotado, sin el enlace, que es lo secreto.
    if (!envio.enviado) {
      console.warn(`[restablecer] no se pudo enviar el correo a ${user.email}: ${envio.motivo}`);
    }

    return { enviado: envio.enviado };
  },

  async restablecerContrasena(data: RestablecerInput) {
    const enlace = await authRepository.findAccessLink(sha256Hex(data.token));
    if (!enlace || enlace.usedAt || enlace.expiresAt <= new Date()) {
      throw new ApiError(400, "El enlace no es válido o ya venció");
    }

    await authRepository.updatePassword(enlace.userId, await argon2.hash(data.password));
    await authRepository.markLinkUsed(enlace.id);
    // Cambiar la clave cierra las sesiones abiertas con la anterior.
    await authRepository.revokeAllRefreshTokens(enlace.userId);

    return { email: enlace.user.email };
  },

  async actualizarPerfil(userId: string, datos: ActualizarPerfilInput) {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new ApiError(401, "Usuario no encontrado");
    }

    const cambiaElCorreo = datos.email !== undefined && datos.email !== user.email;

    if (cambiaElCorreo) {
      // Confirmar la contraseña: con una sesión robada, cambiar el correo
      // bastaría para quedarse con la cuenta.
      if (!datos.password) {
        throw new ApiError(400, "Para cambiar el correo hay que confirmar la contraseña");
      }
      if (!(await argon2.verify(user.password, datos.password))) {
        throw new ApiError(401, "La contraseña no coincide");
      }

      const otro = await authRepository.findUserByEmail(datos.email!);
      if (otro && otro.id !== userId) {
        throw new ApiError(409, "Ese correo ya tiene cuenta");
      }
    }

    const actualizado = await authRepository.updateProfile(userId, {
      ...(datos.name !== undefined ? { name: datos.name } : {}),
      ...(cambiaElCorreo ? { email: datos.email } : {}),
    });

    return toAuthUser(actualizado);
  },

  obtenerDireccion(userId: string) {
    return authRepository.findAddress(userId);
  },

  guardarDireccion(userId: string, datos: DireccionInput) {
    // Los opcionales vacios se guardan como null: si fueran undefined, Prisma
    // los ignoraria y no habria forma de borrar un dato ya cargado.
    return authRepository.upsertAddress(userId, {
      userId,
      street: datos.street,
      district: datos.district,
      city: datos.city,
      recipient: datos.recipient || null,
      phone: datos.phone || null,
      reference: datos.reference || null,
      region: datos.region || null,
      postalCode: datos.postalCode || null,
    });
  },

  async eliminarDireccion(userId: string) {
    await authRepository.deleteAddress(userId);
  },

  async cambiarContrasena(userId: string, datos: CambiarClaveInput) {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new ApiError(401, "Usuario no encontrado");
    }
    if (!(await argon2.verify(user.password, datos.actual))) {
      throw new ApiError(401, "La contraseña actual no coincide");
    }

    await authRepository.updatePassword(userId, await argon2.hash(datos.nueva));
    // Se caen todas las sesiones abiertas con la clave vieja, incluida esta;
    // por eso se emite uno nuevo y quien cambió la clave sigue adentro.
    await authRepository.revokeAllRefreshTokens(userId);

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
    if (!user.isActive) {
      throw new ApiError(403, "La cuenta está suspendida");
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

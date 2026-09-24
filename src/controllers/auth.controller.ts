import type { Request, Response } from "express";
import { authService } from "@/services/auth.service";
import {
  actualizarPerfilSchema,
  cambiarClaveSchema,
  loginSchema,
  olvideSchema,
  registerSchema,
  restablecerSchema,
  verificarCodigoSchema,
} from "@/schemas/auth.schema";
import { ApiError } from "@/middlewares/error-handler";
import { env } from "@/config/env";
import { parseDurationMs } from "@/lib/duration";
import { authRepository } from "@/repositories/auth.repository";

const REFRESH_COOKIE = "refreshToken";

// En produccion el frontend vive en Vercel y la API en otro dominio, o sea que
// la cookie viaja entre sitios distintos: con "strict" el navegador no la manda
// y la sesion se corta a los 15 minutos. Entre sitios exige "none" y Secure.
// En desarrollo son dos puertos de localhost, que cuentan como el mismo sitio.
const enProduccion = env.nodeEnv === "production";

const refreshCookieOptions = {
  httpOnly: true,
  secure: enProduccion,
  sameSite: enProduccion ? ("none" as const) : ("lax" as const),
  path: "/api/auth",
  maxAge: parseDurationMs(env.jwt.refreshExpiresIn),
};

function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
}

export const authController = {
  async register(req: Request, res: Response) {
    const data = registerSchema.parse(req.body);
    const { accessToken, refreshToken, user } = await authService.register(data);
    setRefreshCookie(res, refreshToken);
    res.status(201).json({ accessToken, user });
  },

  async login(req: Request, res: Response) {
    const data = loginSchema.parse(req.body);
    const resultado = await authService.login(data);

    // Un admin todavia no tiene sesion: le falta el codigo del correo.
    if ("requiereCodigo" in resultado) {
      res.json(resultado);
      return;
    }

    setRefreshCookie(res, resultado.refreshToken);
    res.json({ accessToken: resultado.accessToken, user: resultado.user });
  },

  async verificarCodigo(req: Request, res: Response) {
    const data = verificarCodigoSchema.parse(req.body);
    const { accessToken, refreshToken, user } = await authService.verificarSegundoFactor(data);
    setRefreshCookie(res, refreshToken);
    res.json({ accessToken, user });
  },

  async olvide(req: Request, res: Response) {
    const { email } = olvideSchema.parse(req.body);
    await authService.olvideContrasena(email);
    // Siempre la misma respuesta: no puede delatar si ese correo tiene cuenta.
    res.json({ mensaje: "Si ese correo tiene cuenta, le llega un enlace" });
  },

  async restablecer(req: Request, res: Response) {
    const data = restablecerSchema.parse(req.body);
    await authService.restablecerContrasena(data);
    res.json({ mensaje: "Contraseña actualizada" });
  },

  async refresh(req: Request, res: Response) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) {
      throw new ApiError(401, "No hay sesión activa");
    }

    const result = await authService.refresh(refreshToken);
    setRefreshCookie(res, result.refreshToken);
    res.json({ accessToken: result.accessToken, user: result.user });
  },

  async logout(req: Request, res: Response) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
    res.status(204).send();
  },

  async actualizarPerfil(req: Request, res: Response) {
    const datos = actualizarPerfilSchema.parse(req.body);
    res.json({ user: await authService.actualizarPerfil(req.user!.sub, datos) });
  },

  async cambiarClave(req: Request, res: Response) {
    const datos = cambiarClaveSchema.parse(req.body);
    const { accessToken, refreshToken, user } = await authService.cambiarContrasena(
      req.user!.sub,
      datos
    );
    setRefreshCookie(res, refreshToken);
    res.json({ accessToken, user });
  },

  async me(req: Request, res: Response) {
    const user = await authRepository.findUserById(req.user!.sub);
    if (!user) {
      throw new ApiError(404, "Usuario no encontrado");
    }
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  },
};

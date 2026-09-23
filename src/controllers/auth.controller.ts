import type { Request, Response } from "express";
import { authService } from "@/services/auth.service";
import { loginSchema, registerSchema } from "@/schemas/auth.schema";
import { ApiError } from "@/middlewares/error-handler";
import { env } from "@/config/env";
import { parseDurationMs } from "@/lib/duration";
import { authRepository } from "@/repositories/auth.repository";

const REFRESH_COOKIE = "refreshToken";

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: "strict" as const,
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
    const { accessToken, refreshToken, user } = await authService.login(data);
    setRefreshCookie(res, refreshToken);
    res.json({ accessToken, user });
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

  async me(req: Request, res: Response) {
    const user = await authRepository.findUserById(req.user!.sub);
    if (!user) {
      throw new ApiError(404, "Usuario no encontrado");
    }
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  },
};

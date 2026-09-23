import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken, type AccessTokenPayload } from "@/lib/jwt";
import { ApiError } from "@/middlewares/error-handler";

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new ApiError(401, "Missing access token"));
  }

  try {
    req.user = verifyAccessToken(header.slice("Bearer ".length));
    next();
  } catch {
    next(new ApiError(401, "Invalid or expired access token"));
  }
}

type Rol = AccessTokenPayload["role"];

// El superadministrador puede todo lo que puede un admin: sin esto habria que
// enumerar los dos roles en cada ruta, y basta olvidarlo en una para dejar al
// dueño afuera de su propio panel.
export function tieneAcceso(rol: Rol, permitidos: Rol[]): boolean {
  if (permitidos.includes(rol)) {
    return true;
  }
  return rol === "SUPERADMIN" && permitidos.includes("ADMIN");
}

export function requireRole(...roles: Rol[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !tieneAcceso(req.user.role, roles)) {
      return next(new ApiError(403, "Forbidden"));
    }
    next();
  };
}

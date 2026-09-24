import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authController } from "@/controllers/auth.controller";
import { asyncHandler } from "@/middlewares/async-handler";
import { requireAuth } from "@/middlewares/auth";

export const authRouter = Router();

// Rate limit en endpoints sensibles a fuerza bruta.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

authRouter.post("/auth/register", authLimiter, asyncHandler(authController.register));
authRouter.post("/auth/login", authLimiter, asyncHandler(authController.login));
authRouter.post("/auth/codigo", authLimiter, asyncHandler(authController.verificarCodigo));
authRouter.post("/auth/olvide", authLimiter, asyncHandler(authController.olvide));
authRouter.post("/auth/restablecer", authLimiter, asyncHandler(authController.restablecer));
authRouter.post("/auth/refresh", asyncHandler(authController.refresh));
authRouter.post("/auth/logout", asyncHandler(authController.logout));
authRouter.get("/auth/me", requireAuth, asyncHandler(authController.me));
authRouter.patch("/auth/me", requireAuth, asyncHandler(authController.actualizarPerfil));
// Con limite: probar contraseñas actuales a repeticion es fuerza bruta.
authRouter.put("/auth/password", requireAuth, authLimiter, asyncHandler(authController.cambiarClave));

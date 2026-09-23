import { Router } from "express";
import { adminUserService } from "@/services/admin-user.service";
import { actualizarAdminSchema, crearAdminSchema } from "@/schemas/admin-user.schema";
import { asyncHandler } from "@/middlewares/async-handler";
import { requireAuth, requireRole } from "@/middlewares/auth";

export const adminUserRouter = Router();

// Todo lo de esta seccion es solo del dueño: un ADMIN comun maneja el catalogo
// pero no da de alta ni de baja a nadie.
const soloSuperadmin = [requireAuth, requireRole("SUPERADMIN")];

adminUserRouter.get(
  "/admin/usuarios",
  soloSuperadmin,
  asyncHandler(async (_req, res) => {
    res.json(await adminUserService.listar());
  })
);

adminUserRouter.post(
  "/admin/usuarios",
  soloSuperadmin,
  asyncHandler(async (req, res) => {
    const datos = crearAdminSchema.parse(req.body);
    res.status(201).json(await adminUserService.crear(datos));
  })
);

adminUserRouter.patch(
  "/admin/usuarios/:id",
  soloSuperadmin,
  asyncHandler(async (req, res) => {
    const cambios = actualizarAdminSchema.parse(req.body);
    res.json(await adminUserService.actualizar(req.user!.sub, req.params.id, cambios));
  })
);

adminUserRouter.delete(
  "/admin/usuarios/:id",
  soloSuperadmin,
  asyncHandler(async (req, res) => {
    await adminUserService.eliminar(req.user!.sub, req.params.id);
    res.status(204).send();
  })
);

// Reenviar el acceso sirve tanto si la invitacion vencio como si el admin
// perdio la contraseña.
adminUserRouter.post(
  "/admin/usuarios/:id/acceso",
  soloSuperadmin,
  asyncHandler(async (req, res) => {
    res.json(await adminUserService.reenviarAcceso(req.params.id));
  })
);

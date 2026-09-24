import { Router } from "express";
import { adminUserService } from "@/services/admin-user.service";
import { confirmacionService } from "@/services/confirmacion.service";
import {
  actualizarAdminSchema,
  crearAdminSchema,
  filtroDeUsuariosSchema,
} from "@/schemas/admin-user.schema";
import { asyncHandler } from "@/middlewares/async-handler";
import { requireAuth, requireRole } from "@/middlewares/auth";
import { requireConfirmacion } from "@/middlewares/confirmacion";

export const adminUserRouter = Router();

// Ver la lista alcanza con ser admin: sirve para saber a quien le llega un
// pedido y a donde. Tocar cuentas es otra cosa.
const puedeVer = [requireAuth, requireRole("ADMIN")];

// Dar de alta, suspender, cambiar el rol o el correo, y eliminar, son del
// dueño, y ademas piden confirmacion por codigo porque no se deshacen.
const soloDuenio = [requireAuth, requireRole("SUPERADMIN"), requireConfirmacion];

adminUserRouter.get(
  "/admin/usuarios",
  puedeVer,
  asyncHandler(async (req, res) => {
    const filtro = filtroDeUsuariosSchema.safeParse(req.query.rol);
    res.json(await adminUserService.listar(filtro.success ? filtro.data : undefined));
  })
);

// Pide el codigo que despues hay que mandar en las cabeceras.
adminUserRouter.post(
  "/admin/confirmacion",
  requireAuth,
  requireRole("SUPERADMIN"),
  asyncHandler(async (req, res) => {
    res.json(await confirmacionService.pedir(req.user!.sub));
  })
);

adminUserRouter.post(
  "/admin/usuarios",
  soloDuenio,
  asyncHandler(async (req, res) => {
    const datos = crearAdminSchema.parse(req.body);
    res.status(201).json(await adminUserService.crear(datos));
  })
);

adminUserRouter.patch(
  "/admin/usuarios/:id",
  soloDuenio,
  asyncHandler(async (req, res) => {
    const cambios = actualizarAdminSchema.parse(req.body);
    res.json(await adminUserService.actualizar(req.user!.sub, req.params.id, cambios));
  })
);

adminUserRouter.delete(
  "/admin/usuarios/:id",
  soloDuenio,
  asyncHandler(async (req, res) => {
    await adminUserService.eliminar(req.user!.sub, req.params.id);
    res.status(204).send();
  })
);

// Reenviar el acceso no cambia nada de la cuenta: no pide confirmacion.
adminUserRouter.post(
  "/admin/usuarios/:id/acceso",
  requireAuth,
  requireRole("SUPERADMIN"),
  asyncHandler(async (req, res) => {
    res.json(await adminUserService.reenviarAcceso(req.params.id));
  })
);

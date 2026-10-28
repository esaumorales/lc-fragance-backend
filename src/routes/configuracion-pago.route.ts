import { Router } from "express";
import { configuracionPagoService } from "@/services/configuracion-pago.service";
import { guardarConfiguracionPagoSchema } from "@/schemas/configuracion-pago.schema";
import { asyncHandler } from "@/middlewares/async-handler";
import { requireAuth, requireRole } from "@/middlewares/auth";

export const configuracionPagoRouter = Router();

// Lo necesita el checkout, que esta abierto a cualquiera: sin esto no habria
// a donde pagar. Solo van los datos de cobro, nunca el correo de avisos.
configuracionPagoRouter.get(
  "/pago",
  asyncHandler(async (_req, res) => {
    res.json(await configuracionPagoService.publica());
  })
);

// Los datos del negocio los maneja cualquier admin, no son de cada uno.
const soloAdmins = [requireAuth, requireRole("ADMIN")];

configuracionPagoRouter.get(
  "/admin/pago",
  soloAdmins,
  asyncHandler(async (_req, res) => {
    res.json(await configuracionPagoService.obtener());
  })
);

configuracionPagoRouter.put(
  "/admin/pago",
  soloAdmins,
  asyncHandler(async (req, res) => {
    const cambios = guardarConfiguracionPagoSchema.parse(req.body);
    res.json(await configuracionPagoService.guardar(cambios));
  })
);

configuracionPagoRouter.delete(
  "/admin/pago",
  soloAdmins,
  asyncHandler(async (_req, res) => {
    res.json(await configuracionPagoService.vaciar());
  })
);

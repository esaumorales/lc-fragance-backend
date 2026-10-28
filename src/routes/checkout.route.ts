import { Router } from "express";
import { checkoutController } from "@/controllers/checkout.controller";
import { asyncHandler } from "@/middlewares/async-handler";
import { sesionOpcional } from "@/middlewares/auth";
import { limiteDePedidos } from "@/middlewares/limite-de-pedidos";

export const checkoutRouter = Router();

// Abierto a proposito: compra quien tiene cuenta y quien no quiso crearse
// una. Si viene con sesion, el pedido queda atado a ella.
checkoutRouter.post(
  "/checkout",
  sesionOpcional,
  limiteDePedidos,
  asyncHandler(checkoutController.checkout)
);

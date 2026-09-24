import { Router } from "express";
import { z } from "zod";
import { orderService } from "@/services/order.service";
import { asyncHandler } from "@/middlewares/async-handler";
import { requireAuth, requireRole } from "@/middlewares/auth";
import { getStockEmitter } from "@/lib/stock-emitter";

export const orderRouter = Router();

const estadoSchema = z.enum(["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"]);
const avanceSchema = z.object({ status: z.enum(["SHIPPED", "DELIVERED"]) });

// Cada quien ve sus propios pedidos.
orderRouter.get(
  "/pedidos",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await orderService.listarDelUsuario(req.user!.sub));
  })
);

const soloAdmin = [requireAuth, requireRole("ADMIN")];

orderRouter.get(
  "/admin/pedidos",
  soloAdmin,
  asyncHandler(async (req, res) => {
    const filtro = estadoSchema.safeParse(req.query.status);
    res.json(await orderService.listar(filtro.success ? filtro.data : undefined));
  })
);

// Confirmar es lo que descuenta el stock: hasta aca el pedido no tocó nada.
orderRouter.post(
  "/admin/pedidos/:id/confirmar",
  soloAdmin,
  asyncHandler(async (req, res) => {
    res.json(await orderService.confirmar(req.params.id, getStockEmitter(req)));
  })
);

orderRouter.post(
  "/admin/pedidos/:id/cancelar",
  soloAdmin,
  asyncHandler(async (req, res) => {
    res.json(await orderService.cancelar(req.params.id, getStockEmitter(req)));
  })
);

orderRouter.patch(
  "/admin/pedidos/:id",
  soloAdmin,
  asyncHandler(async (req, res) => {
    const { status } = avanceSchema.parse(req.body);
    res.json(await orderService.avanzar(req.params.id, status));
  })
);

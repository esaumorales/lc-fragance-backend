import { Router } from "express";
import { uploadService } from "@/services/upload.service";
import { requireAuth, requireRole } from "@/middlewares/auth";
import { asyncHandler } from "@/middlewares/async-handler";
import { limiteDeVouchers } from "@/middlewares/limite-de-pedidos";

export const uploadRouter = Router();

// Solo el admin puede pedir firmas: si no, cualquiera subiria a la cuenta.
uploadRouter.post(
  "/uploads/signature",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (_req, res) => {
    res.json(uploadService.firmar());
  })
);

// El comprobante lo sube quien compra, que puede no tener cuenta. Es la unica
// subida abierta, asi que va acotada: carpeta propia, tope de tamaño, solo
// imagen o PDF, y un tope por IP para que nadie llene la cuenta de Cloudinary.
uploadRouter.post(
  "/uploads/voucher",
  limiteDeVouchers,
  asyncHandler(async (_req, res) => {
    res.json(uploadService.firmar("vouchers"));
  })
);

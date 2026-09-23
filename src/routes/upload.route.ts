import { Router } from "express";
import { uploadService } from "@/services/upload.service";
import { requireAuth, requireRole } from "@/middlewares/auth";
import { asyncHandler } from "@/middlewares/async-handler";

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

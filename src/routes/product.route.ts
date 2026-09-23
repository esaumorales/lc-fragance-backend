import { Router } from "express";
import { productController } from "@/controllers/product.controller";
import { asyncHandler } from "@/middlewares/async-handler";
import { requireAuth, requireRole } from "@/middlewares/auth";

export const productRouter = Router();

productRouter.get("/products", asyncHandler(productController.list));
productRouter.get("/products/:slug", asyncHandler(productController.getOne));

productRouter.post(
  "/products",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(productController.create)
);
productRouter.patch(
  "/products/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(productController.update)
);
productRouter.delete(
  "/products/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(productController.remove)
);
productRouter.patch(
  "/products/:id/stock",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(productController.adjustStock)
);

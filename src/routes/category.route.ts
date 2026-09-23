import { Router } from "express";
import { categoryController } from "@/controllers/category.controller";
import { asyncHandler } from "@/middlewares/async-handler";
import { requireAuth, requireRole } from "@/middlewares/auth";

export const categoryRouter = Router();

categoryRouter.get("/categories", asyncHandler(categoryController.list));
categoryRouter.get("/categories/:idOrSlug", asyncHandler(categoryController.getOne));

categoryRouter.post(
  "/categories",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(categoryController.create)
);
categoryRouter.patch(
  "/categories/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(categoryController.update)
);
categoryRouter.delete(
  "/categories/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(categoryController.remove)
);

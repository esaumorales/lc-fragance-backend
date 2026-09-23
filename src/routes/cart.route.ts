import { Router } from "express";
import { cartController } from "@/controllers/cart.controller";
import { asyncHandler } from "@/middlewares/async-handler";
import { requireAuth } from "@/middlewares/auth";

export const cartRouter = Router();

cartRouter.use("/cart", requireAuth);

cartRouter.get("/cart", asyncHandler(cartController.get));
cartRouter.post("/cart/items", asyncHandler(cartController.addItem));
cartRouter.patch("/cart/items/:productId", asyncHandler(cartController.updateItem));
cartRouter.delete("/cart/items/:productId", asyncHandler(cartController.removeItem));

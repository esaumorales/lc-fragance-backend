import { Router } from "express";
import { checkoutController } from "@/controllers/checkout.controller";
import { asyncHandler } from "@/middlewares/async-handler";
import { requireAuth } from "@/middlewares/auth";

export const checkoutRouter = Router();

checkoutRouter.post("/checkout", requireAuth, asyncHandler(checkoutController.checkout));

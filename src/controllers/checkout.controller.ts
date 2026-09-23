import type { Request, Response } from "express";
import { checkoutService } from "@/services/checkout.service";
import { getStockEmitter } from "@/lib/stock-emitter";

export const checkoutController = {
  async checkout(req: Request, res: Response) {
    const result = await checkoutService.checkout(req.user!.sub, getStockEmitter(req));
    res.status(201).json(result);
  },
};

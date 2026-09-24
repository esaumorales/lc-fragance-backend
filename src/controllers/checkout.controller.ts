import type { Request, Response } from "express";
import { checkoutService } from "@/services/checkout.service";

export const checkoutController = {
  async checkout(req: Request, res: Response) {
    const result = await checkoutService.checkout(req.user!.sub);
    res.status(201).json(result);
  },
};

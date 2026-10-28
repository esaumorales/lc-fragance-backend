import type { Request, Response } from "express";
import { checkoutService } from "@/services/checkout.service";
import { checkoutSchema } from "@/schemas/checkout.schema";

export const checkoutController = {
  async checkout(req: Request, res: Response) {
    const entrada = checkoutSchema.parse(req.body);
    // Sin sesion tambien se compra: ahi el pedido queda sin usuario y los
    // datos de contacto son los unicos que hay.
    const resultado = await checkoutService.checkout(entrada, req.user?.sub);
    res.status(201).json(resultado);
  },
};

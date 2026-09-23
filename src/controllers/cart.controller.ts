import type { Request, Response } from "express";
import { cartService } from "@/services/cart.service";
import { addCartItemSchema, updateCartItemSchema } from "@/schemas/cart.schema";

export const cartController = {
  async get(req: Request, res: Response) {
    const cart = await cartService.getCart(req.user!.sub);
    res.json(cart);
  },

  async addItem(req: Request, res: Response) {
    const { productId, quantity } = addCartItemSchema.parse(req.body);
    const cart = await cartService.addItem(req.user!.sub, productId, quantity);
    res.status(201).json(cart);
  },

  async updateItem(req: Request, res: Response) {
    const { quantity } = updateCartItemSchema.parse(req.body);
    const cart = await cartService.updateItemQuantity(req.user!.sub, req.params.productId, quantity);
    res.json(cart);
  },

  async removeItem(req: Request, res: Response) {
    const cart = await cartService.removeItem(req.user!.sub, req.params.productId);
    res.json(cart);
  },
};

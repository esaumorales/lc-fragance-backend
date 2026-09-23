import { z } from "@/lib/zod-openapi";

export const addCartItemSchema = z
  .object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).default(1),
  })
  .openapi("AddCartItem");

export const updateCartItemSchema = z
  .object({
    quantity: z.number().int().min(1),
  })
  .openapi("UpdateCartItem");

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

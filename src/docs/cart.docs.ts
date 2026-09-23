import { z } from "@/lib/zod-openapi";
import { registry } from "@/docs/registry";
import { addCartItemSchema, updateCartItemSchema } from "@/schemas/cart.schema";

const cartResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  items: z.array(
    z.object({
      id: z.string().uuid(),
      productId: z.string().uuid(),
      quantity: z.number(),
    })
  ),
});

registry.registerPath({
  method: "get",
  path: "/cart",
  summary: "Ver el carrito del usuario autenticado",
  tags: ["Cart"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "Carrito", content: { "application/json": { schema: cartResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/cart/items",
  summary: "Agregar un producto al carrito",
  tags: ["Cart"],
  security: [{ bearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: addCartItemSchema } } } },
  responses: {
    201: { description: "Carrito actualizado", content: { "application/json": { schema: cartResponseSchema } } },
    409: { description: "Stock insuficiente" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/cart/items/{productId}",
  summary: "Actualizar la cantidad de un producto en el carrito",
  tags: ["Cart"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ productId: z.string().uuid() }),
    body: { content: { "application/json": { schema: updateCartItemSchema } } },
  },
  responses: {
    200: { description: "Carrito actualizado", content: { "application/json": { schema: cartResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/cart/items/{productId}",
  summary: "Quitar un producto del carrito",
  tags: ["Cart"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ productId: z.string().uuid() }) },
  responses: {
    200: { description: "Carrito actualizado", content: { "application/json": { schema: cartResponseSchema } } },
  },
});

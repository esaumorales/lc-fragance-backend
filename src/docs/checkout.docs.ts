import { z } from "@/lib/zod-openapi";
import { registry } from "@/docs/registry";

const checkoutResponseSchema = z.object({
  order: z.object({
    id: z.string().uuid(),
    status: z.string(),
    total: z.string(),
  }),
  whatsappUrl: z.string().nullable(),
  yape: z.object({ phone: z.string(), name: z.string() }),
});

registry.registerPath({
  method: "post",
  path: "/checkout",
  summary: "Confirmar el pedido a partir del carrito (sin pasarela de pago: WhatsApp/Yape)",
  tags: ["Checkout"],
  security: [{ bearerAuth: [] }],
  responses: {
    201: {
      description: "Pedido creado. Devuelve un link de WhatsApp prellenado y los datos de Yape.",
      content: { "application/json": { schema: checkoutResponseSchema } },
    },
    400: { description: "El carrito está vacío" },
    409: { description: "Stock insuficiente para uno o más productos" },
  },
});

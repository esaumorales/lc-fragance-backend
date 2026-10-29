import { z } from "@/lib/zod-openapi";

export const checkoutSchema = z
  .object({
    nombre: z.string().trim().min(2).max(120),
    // Obligatorio aunque tenga cuenta: es a donde se avisa que el pedido se
    // acepto, y quien compra tiene que poder verlo antes de confirmar.
    correo: z.string().trim().toLowerCase().email(),
    celular: z
      .string()
      .trim()
      .regex(/^[\d\s+()-]{6,20}$/, "Número de celular inválido"),
    // Acepta letras ademas de digitos: el carnet de extranjeria las lleva, y
    // exigir ocho numeros dejaria afuera a quien no tiene DNI peruano.
    dni: z
      .string()
      .trim()
      .regex(/^[0-9A-Za-z]{8,15}$/, "Documento inválido"),

    metodoPago: z.enum(["YAPE", "TRANSFERENCIA"]),
    voucherUrl: z.string().url().nullable().optional(),

    entrega: z.enum(["RECOJO", "DELIVERY"]),
    direccion: z.string().trim().max(300).nullable().optional(),
    nota: z.string().trim().max(500).nullable().optional(),

    // Solo para quien compra sin cuenta: su carrito vive en el navegador y
    // no hay nada guardado en el servidor. Los precios no se leen de aca,
    // se buscan en la base.
    items: z
      .array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(99) }))
      .min(1)
      .max(50)
      .optional(),
  })
  .openapi("Checkout");

export type CheckoutInput = z.infer<typeof checkoutSchema>;

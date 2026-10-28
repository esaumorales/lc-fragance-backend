import { z } from "@/lib/zod-openapi";


// Lo que el admin promete al aceptar. Puede elegir una opcion rapida o
// escribirlo: el plazo real depende del pedido y de la agenda de la tienda.
export const PLAZOS_SUGERIDOS = [
  "Hoy mismo",
  "Mañana",
  "En 2 o 3 días",
  "Esta semana",
] as const;

export const confirmarPedidoSchema = z
  .object({
    plazo: z.string().trim().min(2).max(80),
  })
  .openapi("ConfirmarPedido");

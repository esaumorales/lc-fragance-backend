import type { Prisma } from "@prisma/client";

// El texto con el que se abre el chat de WhatsApp.

export type RenglonDelPedido = {
  name: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
};

/**
 * Lo que escribe quien compra, ya redactado.
 *
 * Arranca diciendo que quiere el producto y no que quiere coordinar un pago:
 * del otro lado hay una persona que necesita saber en un renglon que le estan
 * pidiendo. El detalle del Yape ya esta en la pantalla, no hace falta
 * repetirlo aca.
 */
export function mensajeDePedido(
  orderId: string,
  items: readonly RenglonDelPedido[],
  total: Prisma.Decimal
): string {
  const encabezado = items.length === 1 ? "Hola, quiero este producto:" : "Hola, quiero estos productos:";
  const renglones = items.map(
    (item) => `- ${item.quantity}x ${item.name} (S/ ${item.unitPrice.toString()} c/u)`
  );

  return [
    encabezado,
    ...renglones,
    `Total: S/ ${total.toString()}`,
    `Pedido #${orderId.slice(0, 8)}`,
  ].join("\n");
}

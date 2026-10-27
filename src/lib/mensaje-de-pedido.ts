import type { Prisma } from "@prisma/client";

// El texto con el que se abre el chat de WhatsApp.

export type RenglonDelPedido = {
  name: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
};

/** Siempre con dos decimales: "S/ 74.5" parece un precio a medio escribir. */
function soles(monto: Prisma.Decimal): string {
  return `S/ ${monto.toFixed(2)}`;
}

function renglon(item: RenglonDelPedido): string {
  const subtotal = item.unitPrice.mul(item.quantity);
  // El precio por unidad solo cuando hay mas de una: con una sola seria
  // repetir el mismo numero dos veces en la misma linea.
  const cadaUno = item.quantity > 1 ? ` (${soles(item.unitPrice)} c/u)` : "";
  const cantidad = item.quantity > 1 ? ` x${item.quantity}` : "";
  return `- ${item.name}${cantidad} · ${soles(subtotal)}${cadaUno}`;
}

/**
 * Lo que escribe quien compra, ya redactado.
 *
 * Esta escrito como lo escribiria una persona y no como un comprobante:
 * del otro lado hay alguien atendiendo, y un mensaje que arranca con
 * "Hola" y pide confirmacion invita a responder. El detalle del Yape ya
 * esta en la pantalla, no hace falta repetirlo aca.
 */
export function mensajeDePedido(
  orderId: string,
  items: readonly RenglonDelPedido[],
  total: Prisma.Decimal
): string {
  const saludo =
    items.length === 1
      ? "¡Hola! Quiero llevarme este producto:"
      : "¡Hola! Quiero llevarme estos productos:";

  // El total se omite cuando ya esta a la vista en el unico renglon.
  const unaSolaUnidad = items.length === 1 && items[0]!.quantity === 1;
  const cierre = unaSolaUnidad
    ? "¿Me confirmás cómo seguimos?"
    : `Son ${soles(total)} en total. ¿Me confirmás cómo seguimos?`;

  return [saludo, "", ...items.map(renglon), "", cierre, "", `Pedido #${orderId.slice(0, 8)}`].join(
    "\n"
  );
}

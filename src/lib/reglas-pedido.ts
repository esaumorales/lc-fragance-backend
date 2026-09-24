import type { OrderStatus } from "@prisma/client";

export type Veredicto = { permitido: true } | { permitido: false; motivo: string };

const PERMITIDO: Veredicto = { permitido: true };

// Estados en los que el stock ya salio del inventario.
const DESCONTADOS: OrderStatus[] = ["PAID", "SHIPPED", "DELIVERED"];

export function yaDescontoStock(estado: OrderStatus): boolean {
  return DESCONTADOS.includes(estado);
}

/**
 * Decide si un pedido puede confirmarse.
 *
 * Es pura para poder probar cada rechazo sin base de datos: quien llama aporta
 * el estado y el stock disponible de cada producto.
 */
export function puedeConfirmar(
  estado: OrderStatus,
  items: { nombre: string; cantidad: number; stock: number }[]
): Veredicto {
  if (estado === "CANCELLED") {
    return { permitido: false, motivo: "El pedido está cancelado" };
  }
  if (yaDescontoStock(estado)) {
    return { permitido: false, motivo: "El pedido ya estaba confirmado" };
  }

  // Entre el checkout y la confirmacion puede haberse vendido lo mismo a otro.
  const faltantes = items.filter((item) => item.cantidad > item.stock);
  if (faltantes.length > 0) {
    const detalle = faltantes
      .map((item) => `${item.nombre} (pide ${item.cantidad}, hay ${item.stock})`)
      .join(", ");
    return { permitido: false, motivo: `No alcanza el stock para: ${detalle}` };
  }

  return PERMITIDO;
}

export function puedeCancelar(estado: OrderStatus): Veredicto {
  if (estado === "CANCELLED") {
    return { permitido: false, motivo: "El pedido ya estaba cancelado" };
  }
  return PERMITIDO;
}

// El avance normal del pedido una vez cobrado.
const SIGUIENTES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PAID: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
};

export function puedeAvanzarA(estado: OrderStatus, destino: OrderStatus): Veredicto {
  if ((SIGUIENTES[estado] ?? []).includes(destino)) {
    return PERMITIDO;
  }
  return { permitido: false, motivo: `Un pedido ${estado} no puede pasar a ${destino}` };
}

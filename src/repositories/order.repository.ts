import { prisma } from "@/lib/prisma";
import type { OrderStatus, Prisma } from "@prisma/client";

// Estados en los que el stock ya salio del inventario.
export const ESTADOS_DESCONTADOS: OrderStatus[] = ["PAID", "SHIPPED", "DELIVERED"];

const CON_DETALLE = {
  items: { include: { product: { select: { id: true, name: true, sku: true, stock: true } } } },
  user: { select: { id: true, name: true, email: true } },
} satisfies Prisma.OrderInclude;

export const orderRepository = {
  /**
   * Crea el pedido y vacia el carrito, sin tocar el stock.
   *
   * El stock se descuenta recien cuando el administrador confirma que la
   * compra ocurrio: si saliera aca, cualquiera podria agotar el catalogo
   * haciendo checkout y no pagando nunca.
   */
  async createFromCart(
    userId: string,
    cartId: string,
    items: { productId: string; quantity: number; unitPrice: Prisma.Decimal }[],
    total: Prisma.Decimal
  ) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: { userId, total, items: { create: items } },
        include: { items: true },
      });

      await tx.cartItem.deleteMany({ where: { cartId } });

      return order;
    });
  },

  findById(id: string) {
    return prisma.order.findUnique({ where: { id }, include: CON_DETALLE });
  },

  listar(status?: OrderStatus) {
    return prisma.order.findMany({
      where: status ? { status } : undefined,
      include: CON_DETALLE,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  },

  listarDelUsuario(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      include: CON_DETALLE,
      orderBy: { createdAt: "desc" },
    });
  },

  // Confirmar descuenta el stock y deja constancia: todo o nada.
  async confirmar(id: string, items: { productId: string; quantity: number }[]) {
    return prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
        await tx.inventoryLog.create({
          data: { productId: item.productId, change: -item.quantity, reason: "order" },
        });
      }

      return tx.order.update({ where: { id }, data: { status: "PAID" }, include: CON_DETALLE });
    });
  },

  // Cancelar devuelve al inventario solo lo que habia salido.
  async cancelar(
    id: string,
    items: { productId: string; quantity: number }[],
    devolverStock: boolean
  ) {
    return prisma.$transaction(async (tx) => {
      if (devolverStock) {
        for (const item of items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
          await tx.inventoryLog.create({
            data: { productId: item.productId, change: item.quantity, reason: "order_cancelled" },
          });
        }
      }

      return tx.order.update({
        where: { id },
        data: { status: "CANCELLED" },
        include: CON_DETALLE,
      });
    });
  },

  cambiarEstado(id: string, status: OrderStatus) {
    return prisma.order.update({ where: { id }, data: { status }, include: CON_DETALLE });
  },
};

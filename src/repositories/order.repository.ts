import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const orderRepository = {
  async createFromCart(userId: string, cartId: string, items: { productId: string; quantity: number; unitPrice: Prisma.Decimal }[], total: Prisma.Decimal) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId,
          total,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
        await tx.inventoryLog.create({
          data: { productId: item.productId, change: -item.quantity, reason: "order" },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId } });

      return order;
    });
  },

  findById(id: string) {
    return prisma.order.findUnique({ where: { id }, include: { items: true } });
  },
};

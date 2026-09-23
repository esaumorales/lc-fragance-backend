import { prisma } from "@/lib/prisma";

const cartInclude = {
  items: { include: { product: true }, orderBy: { id: "asc" as const } },
};

export const cartRepository = {
  findOrCreateByUserId(userId: string) {
    return prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: cartInclude,
    });
  },

  findItem(cartId: string, productId: string) {
    return prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId, productId } },
    });
  },

  upsertItem(cartId: string, productId: string, quantity: number) {
    return prisma.cartItem.upsert({
      where: { cartId_productId: { cartId, productId } },
      update: { quantity },
      create: { cartId, productId, quantity },
    });
  },

  updateItemQuantity(cartId: string, productId: string, quantity: number) {
    return prisma.cartItem.update({
      where: { cartId_productId: { cartId, productId } },
      data: { quantity },
    });
  },

  removeItem(cartId: string, productId: string) {
    return prisma.cartItem.delete({
      where: { cartId_productId: { cartId, productId } },
    });
  },

  clear(cartId: string) {
    return prisma.cartItem.deleteMany({ where: { cartId } });
  },
};

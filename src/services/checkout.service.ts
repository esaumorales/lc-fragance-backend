import { Prisma } from "@prisma/client";
import { cartRepository } from "@/repositories/cart.repository";
import { orderRepository } from "@/repositories/order.repository";
import { ApiError } from "@/middlewares/error-handler";
import { env } from "@/config/env";

function buildWhatsappMessage(orderId: string, items: { name: string; quantity: number; unitPrice: Prisma.Decimal }[], total: Prisma.Decimal) {
  const lines = items.map(
    (item) => `- ${item.quantity}x ${item.name} (S/ ${item.unitPrice.toString()} c/u)`
  );

  return [
    `Hola, hice el pedido #${orderId.slice(0, 8)} y quiero coordinar el pago:`,
    ...lines,
    `Total: S/ ${total.toString()}`,
    `Pago por Yape a nombre de ${env.checkout.yapeName} (${env.checkout.yapePhone}).`,
  ].join("\n");
}

export const checkoutService = {
  async checkout(userId: string) {
    const cart = await cartRepository.findOrCreateByUserId(userId);

    if (cart.items.length === 0) {
      throw new ApiError(400, "El carrito está vacío");
    }

    const insufficient = cart.items.filter((item) => item.quantity > item.product.stock);
    if (insufficient.length > 0) {
      throw new ApiError(
        409,
        `Stock insuficiente para: ${insufficient.map((i) => i.product.name).join(", ")}`
      );
    }

    const total = cart.items.reduce(
      (sum, item) => sum.add(item.product.price.mul(item.quantity)),
      new Prisma.Decimal(0)
    );

    const orderItems = cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.product.price,
    }));

    // El stock no se toca aca: sale recien cuando el administrador confirma
    // que la compra ocurrio. Si saliera ahora, cualquiera podria agotar el
    // catalogo haciendo checkout y no pagando nunca.
    const order = await orderRepository.createFromCart(userId, cart.id, orderItems, total);

    const whatsappMessage = buildWhatsappMessage(
      order.id,
      cart.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price,
      })),
      total
    );

    const whatsappUrl = env.checkout.whatsappPhone
      ? `https://wa.me/${env.checkout.whatsappPhone}?text=${encodeURIComponent(whatsappMessage)}`
      : null;

    return {
      order,
      whatsappUrl,
      yape: { phone: env.checkout.yapePhone, name: env.checkout.yapeName },
    };
  },
};

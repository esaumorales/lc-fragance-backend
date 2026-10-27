import { Prisma } from "@prisma/client";
import { cartRepository } from "@/repositories/cart.repository";
import { orderRepository } from "@/repositories/order.repository";
import { ApiError } from "@/middlewares/error-handler";
import { env } from "@/config/env";
import { precioVigente } from "@/lib/precio-vigente";
import { adminUserRepository } from "@/repositories/admin-user.repository";
import { telefonoDeContacto } from "@/lib/telefono-de-contacto";

function armarMensaje(orderId: string, items: { name: string; quantity: number; unitPrice: Prisma.Decimal }[], total: Prisma.Decimal) {
  const lines = items.map(
    (item) => `- ${item.quantity}x ${item.name} (S/ ${item.unitPrice.toString()} c/u)`
  );

  // No se pide comprobante: el pago lo da por bueno el administrador desde el
  // panel, asi que el mensaje solo sirve para avisar y coordinar.
  return [
    `Hola, hice el pedido #${orderId.slice(0, 8)} y quiero coordinar el pago:`,
    ...lines,
    `Total: S/ ${total.toString()}`,
    `Pago por Yape a nombre de ${env.checkout.yapeName} (${env.checkout.yapePhone}).`,
  ].join("\n");
}

/**
 * El numero al que escribe quien compra.
 *
 * Sale del perfil de quien atiende y no de la configuracion: asi se cambia
 * desde la pantalla de perfil, sin tocar variables de entorno ni desplegar.
 */
async function telefonoParaCoordinar(): Promise<string | null> {
  const contactos = await adminUserRepository.contactosDelPanel();
  return telefonoDeContacto(
    contactos.map((contacto) => ({
      role: contacto.role as "ADMIN" | "SUPERADMIN",
      createdAt: contacto.createdAt,
      telefono: contacto.address?.phone ?? null,
    })),
    env.checkout.whatsappPhone || null
  );
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

    // Un solo instante para toda la operacion: si se consultara el reloj por
    // renglon, una oferta que vence justo en el medio dejaria el pedido con
    // unos items en oferta y otros no.
    const ahora = new Date();

    const lineas = cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: precioVigente(item.product, ahora),
    }));

    const total = lineas.reduce(
      (sum, linea) => sum.add(linea.unitPrice.mul(linea.quantity)),
      new Prisma.Decimal(0)
    );

    // El stock no se toca aca: sale recien cuando el administrador confirma
    // que la compra ocurrio. Si saliera ahora, cualquiera podria agotar el
    // catalogo haciendo checkout y no pagando nunca.
    const order = await orderRepository.createFromCart(userId, cart.id, lineas, total);

    const mensaje = armarMensaje(
      order.id,
      cart.items.map((item, indice) => ({
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: lineas[indice]!.unitPrice,
      })),
      total
    );

    const telefono = await telefonoParaCoordinar();
    const whatsappUrl = telefono
      ? `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`
      : null;

    return {
      order,
      whatsappUrl,
      yape: { phone: env.checkout.yapePhone, name: env.checkout.yapeName },
    };
  },
};

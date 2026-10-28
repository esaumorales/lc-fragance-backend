import { Prisma } from "@prisma/client";
import { cartRepository } from "@/repositories/cart.repository";
import { orderRepository } from "@/repositories/order.repository";
import { productRepository } from "@/repositories/product.repository";
import { configuracionPagoRepository } from "@/repositories/configuracion-pago.repository";
import { adminUserRepository } from "@/repositories/admin-user.repository";
import { ApiError } from "@/middlewares/error-handler";
import { env } from "@/config/env";
import { precioVigente } from "@/lib/precio-vigente";
import { telefonoDeContacto } from "@/lib/telefono-de-contacto";
import { mensajeDePedido } from "@/lib/mensaje-de-pedido";
import { costoDeEnvio, revisarPedido } from "@/lib/validar-pedido";
import { motivoParaNoVender } from "@/lib/reglas-de-pago";
import { emailService, plantillas } from "@/services/email.service";
import type { CheckoutInput } from "@/schemas/checkout.schema";

type Linea = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
};

/**
 * Los productos del pedido, con el precio que sale de la base.
 *
 * Quien tiene cuenta los trae de su carrito guardado; quien no, los manda en
 * la peticion. En los dos casos el precio y el stock se leen del servidor:
 * creerle al navegador seria dejar que cualquiera elija cuanto paga.
 */
async function armarLineas(entrada: CheckoutInput, userId?: string) {
  const ahora = new Date();

  if (userId) {
    const cart = await cartRepository.findOrCreateByUserId(userId);
    if (cart.items.length === 0) throw new ApiError(400, "El carrito está vacío");

    const sinStock = cart.items.filter((item) => item.quantity > item.product.stock);
    if (sinStock.length > 0) {
      throw new ApiError(409, `Sin stock para: ${sinStock.map((i) => i.product.name).join(", ")}`);
    }

    const lineas: Linea[] = cart.items.map((item) => ({
      productId: item.productId,
      name: item.product.name,
      quantity: item.quantity,
      unitPrice: precioVigente(item.product, ahora),
    }));
    return { lineas, cartId: cart.id as string | undefined };
  }

  if (!entrada.items?.length) throw new ApiError(400, "El carrito está vacío");

  const productos = await productRepository.findByIds(entrada.items.map((i) => i.productId));
  const porId = new Map(productos.map((p) => [p.id, p]));

  const lineas: Linea[] = entrada.items.map((pedido) => {
    const producto = porId.get(pedido.productId);
    if (!producto) throw new ApiError(404, "Hay un producto que ya no está disponible");
    if (pedido.quantity > producto.stock) {
      throw new ApiError(409, `Sin stock para: ${producto.name}`);
    }
    return {
      productId: producto.id,
      name: producto.name,
      quantity: pedido.quantity,
      unitPrice: precioVigente(producto, ahora),
    };
  });

  return { lineas, cartId: undefined };
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

/** Aviso a la tienda. No se espera que corte el pedido si falla. */
async function avisarALaTienda(
  correo: string | null,
  orderId: string,
  entrada: CheckoutInput,
  lineas: Linea[],
  total: Prisma.Decimal
) {
  if (!correo) return;

  await emailService.enviar({
    para: correo,
    asunto: `Pedido nuevo #${orderId.slice(0, 8)} — S/ ${total.toFixed(2)}`,
    html: plantillas.pedidoNuevo({
      orderId,
      nombre: entrada.nombre,
      correo: entrada.correo,
      celular: entrada.celular,
      metodoPago: entrada.metodoPago,
      entrega: entrada.entrega,
      direccion: entrada.direccion ?? null,
      nota: entrada.nota ?? null,
      voucherUrl: entrada.voucherUrl ?? null,
      items: lineas.map((l) => ({
        name: l.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice.toFixed(2),
      })),
      total: total.toFixed(2),
    }),
  });
}

export const checkoutService = {
  async checkout(entrada: CheckoutInput, userId?: string) {
    const config = await configuracionPagoRepository.obtener();

    // Sin medios de cobro no hay a donde pagar: mejor frenar aca que dejar a
    // alguien transfiriendo a ningun lado.
    const motivo = motivoParaNoVender(config);
    if (motivo) throw new ApiError(409, motivo);

    const problema = revisarPedido(entrada, config);
    if (problema) throw new ApiError(400, problema);

    const { lineas, cartId } = await armarLineas(entrada, userId);

    const subtotal = lineas.reduce(
      (suma, linea) => suma.add(linea.unitPrice.mul(linea.quantity)),
      new Prisma.Decimal(0)
    );
    const envio = new Prisma.Decimal(costoDeEnvio(entrada.entrega, Number(config.costoDelivery)));
    const total = subtotal.add(envio);

    // El stock no se descuenta aca: sale cuando el admin acepta el pedido.
    const order = await orderRepository.crear(
      {
        userId: userId ?? null,
        nombre: entrada.nombre,
        correo: entrada.correo,
        celular: entrada.celular,
        metodoPago: entrada.metodoPago,
        voucherUrl: entrada.voucherUrl ?? null,
        entrega: entrada.entrega,
        direccion: entrada.direccion ?? null,
        costoEnvio: envio,
        nota: entrada.nota ?? null,
        total,
      },
      lineas.map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice })),
      cartId
    );

    await avisarALaTienda(config.correoDeAvisos, order.id, entrada, lineas, total);

    const telefono = await telefonoParaCoordinar();
    const mensaje = mensajeDePedido(order.id, lineas, total);

    return {
      order,
      whatsappUrl: telefono ? `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}` : null,
    };
  },
};

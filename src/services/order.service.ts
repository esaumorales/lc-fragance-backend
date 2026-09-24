import type { OrderStatus } from "@prisma/client";
import { orderRepository } from "@/repositories/order.repository";
import { ApiError } from "@/middlewares/error-handler";
import { puedeAvanzarA, puedeCancelar, puedeConfirmar, yaDescontoStock } from "@/lib/reglas-pedido";
import type { StockEmitter } from "@/services/product.service";

async function buscarOFallar(id: string) {
  const pedido = await orderRepository.findById(id);
  if (!pedido) {
    throw new ApiError(404, "No existe ese pedido");
  }
  return pedido;
}

export const orderService = {
  listar(status?: OrderStatus) {
    return orderRepository.listar(status);
  },

  listarDelUsuario(userId: string) {
    return orderRepository.listarDelUsuario(userId);
  },

  /**
   * Confirma que la compra ocurrió y recién ahí descuenta el stock.
   *
   * Hasta este momento el pedido no tocó el inventario, así que un carrito
   * abandonado no le quita unidades a nadie.
   */
  async confirmar(id: string, emit?: StockEmitter) {
    const pedido = await buscarOFallar(id);

    const veredicto = puedeConfirmar(
      pedido.status,
      pedido.items.map((item) => ({
        nombre: item.product.name,
        cantidad: item.quantity,
        stock: item.product.stock,
      }))
    );
    if (!veredicto.permitido) {
      throw new ApiError(409, veredicto.motivo);
    }

    const actualizado = await orderRepository.confirmar(
      id,
      pedido.items.map((item) => ({ productId: item.productId, quantity: item.quantity }))
    );

    for (const item of pedido.items) {
      emit?.({ productId: item.productId, stock: item.product.stock - item.quantity });
    }

    return actualizado;
  },

  async cancelar(id: string, emit?: StockEmitter) {
    const pedido = await buscarOFallar(id);

    const veredicto = puedeCancelar(pedido.status);
    if (!veredicto.permitido) {
      throw new ApiError(409, veredicto.motivo);
    }

    // Solo vuelve al inventario lo que efectivamente habia salido.
    const devolverStock = yaDescontoStock(pedido.status);

    const actualizado = await orderRepository.cancelar(
      id,
      pedido.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      devolverStock
    );

    if (devolverStock) {
      for (const item of pedido.items) {
        emit?.({ productId: item.productId, stock: item.product.stock + item.quantity });
      }
    }

    return actualizado;
  },

  async avanzar(id: string, destino: OrderStatus) {
    const pedido = await buscarOFallar(id);

    const veredicto = puedeAvanzarA(pedido.status, destino);
    if (!veredicto.permitido) {
      throw new ApiError(409, veredicto.motivo);
    }

    return orderRepository.cambiarEstado(id, destino);
  },
};

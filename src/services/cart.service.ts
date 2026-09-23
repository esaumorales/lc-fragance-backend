import { cartRepository } from "@/repositories/cart.repository";
import { productRepository } from "@/repositories/product.repository";
import { ApiError } from "@/middlewares/error-handler";

export const cartService = {
  getCart(userId: string) {
    return cartRepository.findOrCreateByUserId(userId);
  },

  async addItem(userId: string, productId: string, quantity: number) {
    const product = await productRepository.findById(productId);
    if (!product || !product.isActive) {
      throw new ApiError(404, "Producto no encontrado");
    }

    const cart = await cartRepository.findOrCreateByUserId(userId);
    const existing = await cartRepository.findItem(cart.id, productId);
    const nextQuantity = (existing?.quantity ?? 0) + quantity;

    if (nextQuantity > product.stock) {
      throw new ApiError(409, `Stock insuficiente: quedan ${product.stock} unidades`);
    }

    await cartRepository.upsertItem(cart.id, productId, nextQuantity);
    return cartRepository.findOrCreateByUserId(userId);
  },

  async updateItemQuantity(userId: string, productId: string, quantity: number) {
    const cart = await cartRepository.findOrCreateByUserId(userId);
    const existing = await cartRepository.findItem(cart.id, productId);
    if (!existing) {
      throw new ApiError(404, "El producto no está en el carrito");
    }

    const product = await productRepository.findById(productId);
    if (!product) {
      throw new ApiError(404, "Producto no encontrado");
    }
    if (quantity > product.stock) {
      throw new ApiError(409, `Stock insuficiente: quedan ${product.stock} unidades`);
    }

    await cartRepository.updateItemQuantity(cart.id, productId, quantity);
    return cartRepository.findOrCreateByUserId(userId);
  },

  async removeItem(userId: string, productId: string) {
    const cart = await cartRepository.findOrCreateByUserId(userId);
    const existing = await cartRepository.findItem(cart.id, productId);
    if (!existing) {
      throw new ApiError(404, "El producto no está en el carrito");
    }

    await cartRepository.removeItem(cart.id, productId);
    return cartRepository.findOrCreateByUserId(userId);
  },
};

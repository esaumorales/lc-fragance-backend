import { describe, expect, it, vi, afterEach } from "vitest";
import { cartService } from "@/services/cart.service";
import { cartRepository } from "@/repositories/cart.repository";
import { productRepository } from "@/repositories/product.repository";

afterEach(() => {
  vi.restoreAllMocks();
});

const userId = "660e8400-e29b-41d4-a716-446655440001";
const productId = "770e8400-e29b-41d4-a716-446655440002";
const cart = { id: "cart-1", userId, items: [] };

describe("cartService.addItem", () => {
  it("lanza 404 si el producto no existe", async () => {
    vi.spyOn(productRepository, "findById").mockResolvedValue(null);

    await expect(cartService.addItem(userId, productId, 1)).rejects.toMatchObject({ status: 404 });
  });

  it("lanza 409 si la cantidad pedida supera el stock", async () => {
    vi.spyOn(productRepository, "findById").mockResolvedValue({
      id: productId,
      isActive: true,
      stock: 2,
    } as never);
    vi.spyOn(cartRepository, "findOrCreateByUserId").mockResolvedValue(cart as never);
    vi.spyOn(cartRepository, "findItem").mockResolvedValue(null);

    await expect(cartService.addItem(userId, productId, 5)).rejects.toMatchObject({ status: 409 });
  });

  it("suma la cantidad si el producto ya estaba en el carrito", async () => {
    vi.spyOn(productRepository, "findById").mockResolvedValue({
      id: productId,
      isActive: true,
      stock: 10,
    } as never);
    vi.spyOn(cartRepository, "findOrCreateByUserId").mockResolvedValue(cart as never);
    vi.spyOn(cartRepository, "findItem").mockResolvedValue({ quantity: 2 } as never);
    const upsertSpy = vi.spyOn(cartRepository, "upsertItem").mockResolvedValue({} as never);

    await cartService.addItem(userId, productId, 3);

    expect(upsertSpy).toHaveBeenCalledWith("cart-1", productId, 5);
  });
});

describe("cartService.updateItemQuantity", () => {
  it("lanza 404 si el producto no está en el carrito", async () => {
    vi.spyOn(cartRepository, "findOrCreateByUserId").mockResolvedValue(cart as never);
    vi.spyOn(cartRepository, "findItem").mockResolvedValue(null);

    await expect(
      cartService.updateItemQuantity(userId, productId, 2)
    ).rejects.toMatchObject({ status: 404 });
  });

  it("lanza 409 si la nueva cantidad supera el stock", async () => {
    vi.spyOn(cartRepository, "findOrCreateByUserId").mockResolvedValue(cart as never);
    vi.spyOn(cartRepository, "findItem").mockResolvedValue({ quantity: 1 } as never);
    vi.spyOn(productRepository, "findById").mockResolvedValue({ stock: 2 } as never);

    await expect(
      cartService.updateItemQuantity(userId, productId, 5)
    ).rejects.toMatchObject({ status: 409 });
  });
});

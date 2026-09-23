import { describe, expect, it, vi, afterEach } from "vitest";
import { Prisma } from "@prisma/client";
import { checkoutService } from "@/services/checkout.service";
import { cartRepository } from "@/repositories/cart.repository";
import { orderRepository } from "@/repositories/order.repository";
import { env } from "@/config/env";

// El telefono se fija en cada prueba y no se hereda del .env: si no, el
// resultado depende de la maquina donde corra.
const telefonoOriginal = env.checkout.whatsappPhone;

afterEach(() => {
  vi.restoreAllMocks();
  env.checkout.whatsappPhone = telefonoOriginal;
});

const userId = "660e8400-e29b-41d4-a716-446655440001";
const productId = "770e8400-e29b-41d4-a716-446655440002";

function cartWithItems(items: { quantity: number; stock: number; price: number }[]) {
  return {
    id: "cart-1",
    userId,
    items: items.map((item, i) => ({
      id: `item-${i}`,
      productId: `${productId}-${i}`,
      quantity: item.quantity,
      product: {
        id: `${productId}-${i}`,
        name: `Producto ${i}`,
        stock: item.stock,
        price: new Prisma.Decimal(item.price),
      },
    })),
  };
}

describe("checkoutService.checkout", () => {
  it("lanza 400 si el carrito está vacío", async () => {
    vi.spyOn(cartRepository, "findOrCreateByUserId").mockResolvedValue(cartWithItems([]) as never);

    await expect(checkoutService.checkout(userId)).rejects.toMatchObject({ status: 400 });
  });

  it("lanza 409 si algún producto no tiene stock suficiente", async () => {
    vi.spyOn(cartRepository, "findOrCreateByUserId").mockResolvedValue(
      cartWithItems([{ quantity: 5, stock: 2, price: 10 }]) as never
    );

    await expect(checkoutService.checkout(userId)).rejects.toMatchObject({ status: 409 });
  });

  it("crea el pedido, emite stock:updated por cada item y arma el link de WhatsApp", async () => {
    env.checkout.whatsappPhone = "51999888777";
    const cart = cartWithItems([
      { quantity: 2, stock: 10, price: 25 },
      { quantity: 1, stock: 5, price: 40 },
    ]);
    vi.spyOn(cartRepository, "findOrCreateByUserId").mockResolvedValue(cart as never);
    vi.spyOn(orderRepository, "createFromCart").mockResolvedValue({
      id: "order-1",
      status: "PENDING",
      total: new Prisma.Decimal(90),
    } as never);
    const emit = vi.fn();

    const result = await checkoutService.checkout(userId, emit);

    expect(result.order.id).toBe("order-1");
    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenCalledWith({ productId: cart.items[0].productId, stock: 8 });
    expect(emit).toHaveBeenCalledWith({ productId: cart.items[1].productId, stock: 4 });
    expect(result.whatsappUrl).toContain("wa.me");
    expect(result.whatsappUrl).toContain(encodeURIComponent("order-1".slice(0, 8)));
  });

  it("deja el link en null si no hay telefono configurado", async () => {
    env.checkout.whatsappPhone = "";
    const cart = cartWithItems([{ quantity: 1, stock: 3, price: 10 }]);
    vi.spyOn(cartRepository, "findOrCreateByUserId").mockResolvedValue(cart as never);
    vi.spyOn(orderRepository, "createFromCart").mockResolvedValue({
      id: "order-2",
      status: "PENDING",
      total: new Prisma.Decimal(10),
    } as never);

    const result = await checkoutService.checkout(userId);

    expect(result.order.id).toBe("order-2");
    expect(result.whatsappUrl).toBeNull();
  });
});

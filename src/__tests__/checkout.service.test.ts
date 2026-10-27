import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { Prisma } from "@prisma/client";
import { checkoutService } from "@/services/checkout.service";
import { cartRepository } from "@/repositories/cart.repository";
import { orderRepository } from "@/repositories/order.repository";
import { adminUserRepository } from "@/repositories/admin-user.repository";
import { env } from "@/config/env";

// El telefono se fija en cada prueba y no se hereda del .env: si no, el
// resultado depende de la maquina donde corra.
const telefonoOriginal = env.checkout.whatsappPhone;

afterEach(() => {
  vi.restoreAllMocks();
  env.checkout.whatsappPhone = telefonoOriginal;
});

// El teléfono del botón sale del perfil de quien atiende. Por defecto nadie
// cargó el suyo, así que cada prueba cae al número de configuración salvo que
// diga lo contrario.
function conContactos(contactos: { role: string; createdAt: Date; phone: string | null }[] = []) {
  vi.spyOn(adminUserRepository, "contactosDelPanel").mockResolvedValue(
    contactos.map((c) => ({
      role: c.role,
      createdAt: c.createdAt,
      address: c.phone ? { phone: c.phone } : null,
    })) as never
  );
}

beforeEach(() => {
  conContactos();
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

  it("crea el pedido pendiente y arma el link de WhatsApp", async () => {
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

    const result = await checkoutService.checkout(userId);

    expect(result.order.id).toBe("order-1");
    expect(result.order.status).toBe("PENDING");
    expect(result.whatsappUrl).toContain("wa.me");
    expect(result.whatsappUrl).toContain(encodeURIComponent("order-1".slice(0, 8)));
  });

  // Lo importante del cambio: un carrito abandonado no le quita unidades a
  // nadie. El stock sale recien cuando el administrador confirma la compra.
  it("no descuenta stock al hacer checkout", async () => {
    env.checkout.whatsappPhone = "51999888777";
    const cart = cartWithItems([{ quantity: 2, stock: 10, price: 25 }]);
    vi.spyOn(cartRepository, "findOrCreateByUserId").mockResolvedValue(cart as never);
    const crear = vi.spyOn(orderRepository, "createFromCart").mockResolvedValue({
      id: "order-2",
      status: "PENDING",
      total: new Prisma.Decimal(50),
    } as never);
    const confirmar = vi.spyOn(orderRepository, "confirmar");

    await checkoutService.checkout(userId);

    expect(crear).toHaveBeenCalledOnce();
    expect(confirmar).not.toHaveBeenCalled();
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

  // El número ya no sale del .env sino del perfil: así se cambia desde la
  // pantalla de perfil, sin tocar variables de entorno ni desplegar.
  it("escribe al teléfono que el administrador puso en su perfil", async () => {
    env.checkout.whatsappPhone = "51999999999";
    conContactos([
      { role: "SUPERADMIN", createdAt: new Date("2026-01-01"), phone: "+51 988 333 444" },
    ]);
    vi.spyOn(cartRepository, "findOrCreateByUserId").mockResolvedValue(
      cartWithItems([{ quantity: 1, stock: 3, price: 10 }]) as never
    );
    vi.spyOn(orderRepository, "createFromCart").mockResolvedValue({
      id: "order-3",
      status: "PENDING",
      total: new Prisma.Decimal(10),
    } as never);

    const result = await checkoutService.checkout(userId);

    expect(result.whatsappUrl).toContain("https://wa.me/51988333444");
  });

  // El mensaje ya no pide comprobante: el pago lo aprueba el administrador.
  it("no le pide el comprobante a quien compra", async () => {
    vi.spyOn(cartRepository, "findOrCreateByUserId").mockResolvedValue(
      cartWithItems([{ quantity: 1, stock: 3, price: 10 }]) as never
    );
    vi.spyOn(orderRepository, "createFromCart").mockResolvedValue({
      id: "order-4",
      status: "PENDING",
      total: new Prisma.Decimal(10),
    } as never);

    const result = await checkoutService.checkout(userId);

    expect(decodeURIComponent(result.whatsappUrl ?? "")).not.toMatch(/comprobante/i);
  });

  // Si la oferta se mostrara pero no se cobrara, el descuento sería mentira.
  it("cobra el precio de oferta cuando está vigente", async () => {
    const cart = cartWithItems([{ quantity: 2, stock: 5, price: 100 }]);
    cart.items[0]!.product = {
      ...cart.items[0]!.product,
      offerPrice: new Prisma.Decimal(60),
      offerStartsAt: null,
      offerEndsAt: null,
    } as never;
    vi.spyOn(cartRepository, "findOrCreateByUserId").mockResolvedValue(cart as never);
    const crear = vi.spyOn(orderRepository, "createFromCart").mockResolvedValue({
      id: "order-5",
      status: "PENDING",
      total: new Prisma.Decimal(120),
    } as never);

    await checkoutService.checkout(userId);

    const [, , lineas, total] = crear.mock.calls[0]!;
    expect(lineas[0]!.unitPrice.toString()).toBe("60");
    expect(total.toString()).toBe("120");
  });
});

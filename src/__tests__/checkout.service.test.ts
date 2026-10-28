import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { checkoutService } from "@/services/checkout.service";
import { cartRepository } from "@/repositories/cart.repository";
import { orderRepository } from "@/repositories/order.repository";
import { productRepository } from "@/repositories/product.repository";
import { configuracionPagoRepository } from "@/repositories/configuracion-pago.repository";
import { adminUserRepository } from "@/repositories/admin-user.repository";
import { emailService } from "@/services/email.service";
import type { CheckoutInput } from "@/schemas/checkout.schema";

const userId = "660e8400-e29b-41d4-a716-446655440001";
const productId = "770e8400-e29b-41d4-a716-446655440002";

const PEDIDO: CheckoutInput = {
  nombre: "Ana Torres",
  correo: "ana@example.com",
  celular: "999111222",
  metodoPago: "YAPE",
  entrega: "RECOJO",
};

function configDePago(cambios: Record<string, unknown> = {}) {
  vi.spyOn(configuracionPagoRepository, "obtener").mockResolvedValue({
    id: "unica",
    titular: "Henrry Pérez",
    yape: "925064242",
    banco: "BCP",
    cuenta: "19103537229057",
    cci: null,
    correoDeAvisos: "tienda@example.com",
    recojoActivo: true,
    deliveryActivo: true,
    costoDelivery: new Prisma.Decimal(0),
    updatedAt: new Date(),
    ...cambios,
  } as never);
}

function producto(extra: Record<string, unknown> = {}) {
  return {
    id: productId,
    name: "Velvet Musk",
    stock: 10,
    price: new Prisma.Decimal(100),
    offerPrice: null,
    offerStartsAt: null,
    offerEndsAt: null,
    ...extra,
  };
}

function conCarrito(cantidad = 1, extra: Record<string, unknown> = {}) {
  vi.spyOn(cartRepository, "findOrCreateByUserId").mockResolvedValue({
    id: "cart-1",
    userId,
    items: [{ id: "i1", productId, quantity: cantidad, product: producto(extra) }],
  } as never);
}

type DatosCreados = { userId: string | null; total: Prisma.Decimal; costoEnvio: Prisma.Decimal };
type LineasCreadas = { quantity: number; unitPrice: Prisma.Decimal }[];

const crear = () => vi.mocked(orderRepository.crear);

function loCreado() {
  const [datos, lineas] = crear().mock.calls[0] as unknown as [DatosCreados, LineasCreadas];
  return { datos, lineas };
}

beforeEach(() => {
  configDePago();
  vi.spyOn(adminUserRepository, "contactosDelPanel").mockResolvedValue([] as never);
  vi.spyOn(emailService, "enviar").mockResolvedValue({ enviado: true });
  vi.spyOn(orderRepository, "crear").mockImplementation((async (datos: object) => ({
    id: "order-1",
    status: "PENDING",
    ...datos,
  })) as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("quien compra con cuenta", () => {
  it("toma los productos de su carrito guardado", async () => {
    conCarrito(2);

    await checkoutService.checkout(PEDIDO, userId);

    const { datos, lineas } = loCreado();
    expect(datos.userId).toBe(userId);
    expect(lineas[0]!.quantity).toBe(2);
  });

  it("falla si el carrito está vacío", async () => {
    vi.spyOn(cartRepository, "findOrCreateByUserId").mockResolvedValue({
      id: "cart-1",
      items: [],
    } as never);

    await expect(checkoutService.checkout(PEDIDO, userId)).rejects.toMatchObject({ status: 400 });
  });

  it("falla si no alcanza el stock", async () => {
    conCarrito(99, { stock: 2 });

    await expect(checkoutService.checkout(PEDIDO, userId)).rejects.toMatchObject({ status: 409 });
  });
});

describe("quien compra sin cuenta", () => {
  beforeEach(() => {
    vi.spyOn(productRepository, "findByIds").mockResolvedValue([producto()] as never);
  });

  it("manda los productos en el pedido y queda sin usuario", async () => {
    await checkoutService.checkout({ ...PEDIDO, items: [{ productId, quantity: 3 }] });

    const { datos, lineas } = loCreado();
    expect(datos.userId).toBeNull();
    expect(lineas[0]!.quantity).toBe(3);
  });

  // El carrito vive en el navegador: si se le creyera el precio, cualquiera
  // elegiría cuánto paga.
  it("el precio sale de la base, no de lo que mandó el navegador", async () => {
    await checkoutService.checkout({ ...PEDIDO, items: [{ productId, quantity: 1 }] });

    expect(loCreado().datos.total.toString()).toBe("100");
    expect(loCreado().lineas[0]!.unitPrice.toString()).toBe("100");
  });

  it("falla si el producto ya no está disponible", async () => {
    vi.spyOn(productRepository, "findByIds").mockResolvedValue([] as never);

    await expect(
      checkoutService.checkout({ ...PEDIDO, items: [{ productId, quantity: 1 }] })
    ).rejects.toMatchObject({ status: 404 });
  });

  it("falla si no manda ningún producto", async () => {
    await expect(checkoutService.checkout(PEDIDO)).rejects.toMatchObject({ status: 400 });
  });
});

describe("cuando la tienda no puede cobrar", () => {
  beforeEach(() => {
    configDePago({ yape: null, cuenta: null, cci: null });
    conCarrito();
  });

  // Lo que pidió el dueño: si borran los datos de pago, no se deja comprar.
  it("frena el pedido y explica por qué", async () => {
    await expect(checkoutService.checkout(PEDIDO, userId)).rejects.toMatchObject({
      status: 409,
      message: expect.stringMatching(/medios de pago/i),
    });
  });

  it("no crea ningún pedido", async () => {
    await checkoutService.checkout(PEDIDO, userId).catch(() => undefined);

    expect(crear()).not.toHaveBeenCalled();
  });
});

describe("la entrega", () => {
  beforeEach(() => conCarrito());

  // La pantalla no muestra el botón, pero el pedido se puede mandar a mano.
  it("rechaza delivery si está apagado", async () => {
    configDePago({ deliveryActivo: false });

    await expect(
      checkoutService.checkout(
        { ...PEDIDO, entrega: "DELIVERY", direccion: "Jr. Union 123" },
        userId
      )
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rechaza delivery sin dirección", async () => {
    await expect(
      checkoutService.checkout({ ...PEDIDO, entrega: "DELIVERY" }, userId)
    ).rejects.toMatchObject({ status: 400 });
  });

  it("suma el costo de envío al total", async () => {
    configDePago({ costoDelivery: new Prisma.Decimal(15) });

    await checkoutService.checkout(
      { ...PEDIDO, entrega: "DELIVERY", direccion: "Jr. Union 123" },
      userId
    );

    expect(loCreado().datos.total.toString()).toBe("115");
    expect(loCreado().datos.costoEnvio.toString()).toBe("15");
  });

  it("el recojo no paga envío aunque haya costo cargado", async () => {
    configDePago({ costoDelivery: new Prisma.Decimal(15) });

    await checkoutService.checkout(PEDIDO, userId);

    expect(loCreado().datos.total.toString()).toBe("100");
  });
});

describe("el precio que se cobra", () => {
  // Si la oferta se mostrara pero no se cobrara, el descuento sería mentira.
  it("usa el precio de oferta cuando está vigente", async () => {
    conCarrito(2, { offerPrice: new Prisma.Decimal(60) });

    await checkoutService.checkout(PEDIDO, userId);

    expect(loCreado().lineas[0]!.unitPrice.toString()).toBe("60");
    expect(loCreado().datos.total.toString()).toBe("120");
  });
});

describe("el aviso a la tienda", () => {
  beforeEach(() => conCarrito());

  it("le llega al correo configurado, con el enlace del voucher", async () => {
    const enviar = vi.spyOn(emailService, "enviar").mockResolvedValue({ enviado: true });

    await checkoutService.checkout(
      { ...PEDIDO, voucherUrl: "https://res.cloudinary.com/demo/voucher.jpg" },
      userId
    );

    const mensaje = enviar.mock.calls[0]![0];
    expect(mensaje.para).toBe("tienda@example.com");
    expect(mensaje.html).toContain("https://res.cloudinary.com/demo/voucher.jpg");
  });

  it("sin correo configurado no se manda nada", async () => {
    configDePago({ correoDeAvisos: null });
    const enviar = vi.spyOn(emailService, "enviar").mockResolvedValue({ enviado: true });

    await checkoutService.checkout(PEDIDO, userId);

    expect(enviar).not.toHaveBeenCalled();
  });
});

describe("el stock", () => {
  // Si saliera en el checkout, cualquiera agotaría el catálogo sin pagar.
  it("no se descuenta al hacer el pedido", async () => {
    conCarrito();
    const confirmar = vi.spyOn(orderRepository, "confirmar");

    await checkoutService.checkout(PEDIDO, userId);

    expect(confirmar).not.toHaveBeenCalled();
  });
});

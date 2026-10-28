import { afterEach, describe, expect, it, vi } from "vitest";
import { orderService } from "@/services/order.service";
import { Prisma } from "@prisma/client";
import { orderRepository } from "@/repositories/order.repository";
import { emailService } from "@/services/email.service";
import { puedeAvanzarA, puedeCancelar, puedeConfirmar, yaDescontoStock } from "@/lib/reglas-pedido";

afterEach(() => {
  vi.restoreAllMocks();
});

const pedidoId = "cc0e8400-e29b-41d4-a716-446655440050";

function pedido(status: "PENDING" | "PAID" | "CANCELLED", stock = 10, cantidad = 2) {
  return {
    id: pedidoId,
    status,
    // Los datos de contacto viven en el pedido: tambien compra quien no tiene
    // cuenta, y el aviso sale de aca.
    nombre: "Ana Torres",
    correo: "ana@example.com",
    total: new Prisma.Decimal(200),
    items: [
      {
        productId: "prod-1",
        quantity: cantidad,
        product: { id: "prod-1", name: "Oud Real", sku: "OUD-01", stock },
      },
    ],
  };
}

describe("reglas de pedido", () => {
  it("un pendiente con stock suficiente se puede confirmar", () => {
    expect(puedeConfirmar("PENDING", [{ nombre: "Oud", cantidad: 2, stock: 5 }])).toEqual({
      permitido: true,
    });
  });

  // Entre el checkout y la confirmación pueden haber vendido lo mismo a otro.
  it("no se confirma si el stock ya no alcanza, y dice cuánto falta", () => {
    const veredicto = puedeConfirmar("PENDING", [{ nombre: "Oud", cantidad: 5, stock: 2 }]);

    expect(veredicto.permitido).toBe(false);
    expect(veredicto).toMatchObject({ motivo: expect.stringContaining("pide 5, hay 2") });
  });

  it("no se confirma dos veces", () => {
    expect(puedeConfirmar("PAID", [{ nombre: "Oud", cantidad: 1, stock: 9 }])).toMatchObject({
      permitido: false,
      motivo: "El pedido ya estaba confirmado",
    });
  });

  it("no se confirma uno cancelado", () => {
    expect(puedeConfirmar("CANCELLED", [])).toMatchObject({ permitido: false });
  });

  it("solo los estados cobrados tienen stock descontado", () => {
    expect(yaDescontoStock("PENDING")).toBe(false);
    expect(yaDescontoStock("CANCELLED")).toBe(false);
    expect(yaDescontoStock("PAID")).toBe(true);
    expect(yaDescontoStock("DELIVERED")).toBe(true);
  });

  it("cancelar dos veces no vale", () => {
    expect(puedeCancelar("CANCELLED")).toMatchObject({ permitido: false });
    expect(puedeCancelar("PENDING")).toEqual({ permitido: true });
  });

  it("el avance respeta el orden: pagado, enviado, entregado", () => {
    expect(puedeAvanzarA("PAID", "SHIPPED")).toEqual({ permitido: true });
    expect(puedeAvanzarA("SHIPPED", "DELIVERED")).toEqual({ permitido: true });
    expect(puedeAvanzarA("PENDING", "SHIPPED")).toMatchObject({ permitido: false });
    expect(puedeAvanzarA("PAID", "DELIVERED")).toMatchObject({ permitido: false });
  });
});

const PLAZO = "En 2 o 3 días";

describe("orderService.confirmar", () => {
  it("descuenta el stock y avisa por socket el valor nuevo", async () => {
    vi.spyOn(orderRepository, "findById").mockResolvedValue(pedido("PENDING", 10, 2) as never);
    const descontar = vi.spyOn(orderRepository, "confirmar").mockResolvedValue({} as never);
    const emit = vi.fn();

    await orderService.confirmar(pedidoId, PLAZO, emit);

    expect(descontar).toHaveBeenCalledWith(pedidoId, [{ productId: "prod-1", quantity: 2 }], PLAZO);
    expect(emit).toHaveBeenCalledWith({ productId: "prod-1", stock: 8 });
  });

  it("rechaza con 409 si el stock ya no alcanza, sin tocar nada", async () => {
    vi.spyOn(orderRepository, "findById").mockResolvedValue(pedido("PENDING", 1, 5) as never);
    const descontar = vi.spyOn(orderRepository, "confirmar");

    await expect(orderService.confirmar(pedidoId, PLAZO)).rejects.toMatchObject({ status: 409 });
    expect(descontar).not.toHaveBeenCalled();
  });

  it("rechaza con 404 si el pedido no existe", async () => {
    vi.spyOn(orderRepository, "findById").mockResolvedValue(null);

    await expect(orderService.confirmar(pedidoId, PLAZO)).rejects.toMatchObject({ status: 404 });
  });
});

describe("orderService.cancelar", () => {
  // Nunca salio del inventario, asi que no hay nada que devolver.
  it("cancelar un pendiente no devuelve stock", async () => {
    vi.spyOn(orderRepository, "findById").mockResolvedValue(pedido("PENDING") as never);
    const cancelar = vi.spyOn(orderRepository, "cancelar").mockResolvedValue({} as never);
    const emit = vi.fn();

    await orderService.cancelar(pedidoId, emit);

    expect(cancelar).toHaveBeenCalledWith(pedidoId, expect.anything(), false);
    expect(emit).not.toHaveBeenCalled();
  });

  it("cancelar uno ya confirmado devuelve el stock", async () => {
    vi.spyOn(orderRepository, "findById").mockResolvedValue(pedido("PAID", 8, 2) as never);
    const cancelar = vi.spyOn(orderRepository, "cancelar").mockResolvedValue({} as never);
    const emit = vi.fn();

    await orderService.cancelar(pedidoId, emit);

    expect(cancelar).toHaveBeenCalledWith(pedidoId, expect.anything(), true);
    expect(emit).toHaveBeenCalledWith({ productId: "prod-1", stock: 10 });
  });

  it("no se cancela uno ya cancelado", async () => {
    vi.spyOn(orderRepository, "findById").mockResolvedValue(pedido("CANCELLED") as never);

    await expect(orderService.cancelar(pedidoId)).rejects.toMatchObject({ status: 409 });
  });
});

describe("el aviso a quien compró", () => {
  // Lo que el admin promete al aceptar tiene que llegarle a la persona.
  it("le manda el plazo al correo del pedido", async () => {
    vi.spyOn(orderRepository, "findById").mockResolvedValue(pedido("PENDING", 10, 2) as never);
    vi.spyOn(orderRepository, "confirmar").mockResolvedValue({} as never);
    const enviar = vi.spyOn(emailService, "enviar").mockResolvedValue({ enviado: true });

    await orderService.confirmar(pedidoId, PLAZO);

    const mensaje = enviar.mock.calls[0]![0];
    expect(mensaje.para).toBe("ana@example.com");
    expect(mensaje.html).toContain(PLAZO);
  });

  // El stock ya salió y el pedido ya está aceptado: un correo caído no puede
  // deshacer eso.
  it("si el correo falla, el pedido queda aceptado igual", async () => {
    vi.spyOn(orderRepository, "findById").mockResolvedValue(pedido("PENDING", 10, 2) as never);
    const descontar = vi.spyOn(orderRepository, "confirmar").mockResolvedValue({} as never);
    vi.spyOn(emailService, "enviar").mockResolvedValue({ enviado: false, motivo: "sin red" });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(orderService.confirmar(pedidoId, PLAZO)).resolves.toBeDefined();
    expect(descontar).toHaveBeenCalled();
  });
});

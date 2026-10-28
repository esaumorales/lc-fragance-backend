import { describe, expect, it, vi } from "vitest";
import {
  ORDEN_DE_BORRADO,
  borrarProductos,
  contarLoQueSeBorra,
} from "@/lib/limpieza-de-productos";

/** Un Prisma de mentira que anota en qué orden le pidieron borrar. */
function prismaFalso(filas: Record<string, number> = {}) {
  const orden: string[] = [];
  const tablas = Object.fromEntries(
    ORDEN_DE_BORRADO.map((tabla) => [
      tabla,
      {
        count: vi.fn().mockResolvedValue(filas[tabla] ?? 0),
        deleteMany: vi.fn().mockImplementation(async () => {
          orden.push(tabla);
          return { count: filas[tabla] ?? 0 };
        }),
      },
    ])
  );

  const cliente = {
    ...tablas,
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => fn(cliente),
  };

  return { cliente, orden };
}

describe("el orden del borrado", () => {
  // CartItem, OrderItem e InventoryLog apuntan a Product sin cascada: si el
  // producto sale primero, Postgres rechaza el borrado por clave foránea.
  it("borra las hijas antes que el producto", async () => {
    const { cliente, orden } = prismaFalso();

    await borrarProductos(cliente as never);

    const producto = orden.indexOf("product");
    expect(orden.indexOf("cartItem")).toBeLessThan(producto);
    expect(orden.indexOf("orderItem")).toBeLessThan(producto);
    expect(orden.indexOf("inventoryLog")).toBeLessThan(producto);
  });

  // Borrar los renglones y dejar el pedido lo convierte en un cascarón: un
  // total sin nada adentro.
  it("borra los renglones antes que el pedido", async () => {
    const { cliente, orden } = prismaFalso();

    await borrarProductos(cliente as never);

    expect(orden.indexOf("orderItem")).toBeLessThan(orden.indexOf("order"));
  });

  it("toca cada tabla una sola vez", async () => {
    const { cliente, orden } = prismaFalso();

    await borrarProductos(cliente as never);

    expect(orden).toHaveLength(ORDEN_DE_BORRADO.length);
    expect(new Set(orden).size).toBe(ORDEN_DE_BORRADO.length);
  });
});

describe("a quién no toca", () => {
  // El pedido fue explícito: productos sí, cuentas no.
  it("no borra usuarios, direcciones ni categorías", () => {
    expect(ORDEN_DE_BORRADO).not.toContain("user");
    expect(ORDEN_DE_BORRADO).not.toContain("address");
    expect(ORDEN_DE_BORRADO).not.toContain("category");
    expect(ORDEN_DE_BORRADO).not.toContain("cart");
  });
});

describe("el conteo previo", () => {
  it("dice cuántas filas se irían de cada tabla", async () => {
    const { cliente } = prismaFalso({ product: 5, orderItem: 14, order: 13, inventoryLog: 13 });

    const conteo = await contarLoQueSeBorra(cliente as never);

    expect(conteo.product).toBe(5);
    expect(conteo.order).toBe(13);
  });

  it("contar no borra nada", async () => {
    const { cliente, orden } = prismaFalso({ product: 5 });

    await contarLoQueSeBorra(cliente as never);

    expect(orden).toEqual([]);
  });
});

describe("si algo falla", () => {
  // Sin transacción quedaría media base borrada: pedidos sin renglones y
  // productos todavía ahí.
  it("todo pasa por una transacción", async () => {
    const { cliente } = prismaFalso();
    const transaccion = vi.spyOn(cliente, "$transaction");

    await borrarProductos(cliente as never);

    expect(transaccion).toHaveBeenCalledOnce();
  });
});

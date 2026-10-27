import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { mensajeDePedido } from "@/lib/mensaje-de-pedido";

const PEDIDO = "5e24fa01-aaaa-bbbb-cccc-dddddddddddd";

function renglon(name: string, quantity: number, precio: number) {
  return { name, quantity, unitPrice: new Prisma.Decimal(precio) };
}

describe("mensajeDePedido", () => {
  // Del otro lado hay una persona: tiene que entender en el primer renglón
  // qué le están pidiendo.
  it("arranca diciendo que quiere el producto", () => {
    const mensaje = mensajeDePedido(PEDIDO, [renglon("Velvet Musk", 1, 59.9)], new Prisma.Decimal(59.9));

    expect(mensaje.split("\n")[0]).toBe("Hola, quiero este producto:");
  });

  it("habla en plural cuando lleva más de uno", () => {
    const mensaje = mensajeDePedido(
      PEDIDO,
      [renglon("Velvet Musk", 1, 59.9), renglon("Oud Royal", 2, 120)],
      new Prisma.Decimal(299.9)
    );

    expect(mensaje.split("\n")[0]).toBe("Hola, quiero estos productos:");
  });

  it("lista cada producto con su cantidad y su precio", () => {
    const mensaje = mensajeDePedido(PEDIDO, [renglon("Velvet Musk", 2, 59.9)], new Prisma.Decimal(119.8));

    expect(mensaje).toContain("- 2x Velvet Musk (S/ 59.9 c/u)");
    expect(mensaje).toContain("Total: S/ 119.8");
  });

  it("lleva el número de pedido, para poder buscarlo después", () => {
    const mensaje = mensajeDePedido(PEDIDO, [renglon("Velvet Musk", 1, 59.9)], new Prisma.Decimal(59.9));

    expect(mensaje).toContain("Pedido #5e24fa01");
  });

  // El detalle del Yape ya está en la pantalla; repetirlo acá alarga el
  // mensaje sin agregar nada.
  it("no repite los datos del Yape", () => {
    const mensaje = mensajeDePedido(PEDIDO, [renglon("Velvet Musk", 1, 59.9)], new Prisma.Decimal(59.9));

    expect(mensaje.toLowerCase()).not.toContain("yape");
  });

  it("no le pide el comprobante a nadie", () => {
    const mensaje = mensajeDePedido(PEDIDO, [renglon("Velvet Musk", 1, 59.9)], new Prisma.Decimal(59.9));

    expect(mensaje.toLowerCase()).not.toContain("comprobante");
  });
});

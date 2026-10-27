import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { mensajeDePedido } from "@/lib/mensaje-de-pedido";

const PEDIDO = "5e24fa01-aaaa-bbbb-cccc-dddddddddddd";

function renglon(name: string, quantity: number, precio: string) {
  return { name, quantity, unitPrice: new Prisma.Decimal(precio) };
}

const UNO = [renglon("Rose Absolue", 1, "74.5")];
const VARIOS = [renglon("Velvet Musk", 2, "59.9"), renglon("Rose Absolue", 1, "74.5")];

describe("cómo saluda", () => {
  // Del otro lado hay una persona atendiendo: el mensaje tiene que invitar a
  // responder, no parecer un comprobante.
  it("saluda y dice qué quiere", () => {
    expect(mensajeDePedido(PEDIDO, UNO, new Prisma.Decimal("74.5")).split("\n")[0]).toBe(
      "¡Hola! Quiero llevarme este producto:"
    );
  });

  it("habla en plural cuando lleva más de uno", () => {
    expect(mensajeDePedido(PEDIDO, VARIOS, new Prisma.Decimal("194.3")).split("\n")[0]).toBe(
      "¡Hola! Quiero llevarme estos productos:"
    );
  });

  it("pide confirmación en vez de cortar seco", () => {
    expect(mensajeDePedido(PEDIDO, UNO, new Prisma.Decimal("74.5"))).toContain(
      "¿Me confirmás cómo seguimos?"
    );
  });
});

describe("los precios", () => {
  // "S/ 74.5" parece un precio a medio escribir.
  it("van con dos decimales", () => {
    const mensaje = mensajeDePedido(PEDIDO, UNO, new Prisma.Decimal("74.5"));

    expect(mensaje).toContain("S/ 74.50");
    expect(mensaje).not.toContain("S/ 74.5 ");
  });

  it("cada renglón muestra lo que suma esa línea", () => {
    const mensaje = mensajeDePedido(PEDIDO, VARIOS, new Prisma.Decimal("194.3"));

    expect(mensaje).toContain("- Velvet Musk x2 · S/ 119.80 (S/ 59.90 c/u)");
    expect(mensaje).toContain("- Rose Absolue · S/ 74.50");
  });

  // Con una sola unidad, el precio unitario sería el mismo número repetido.
  it("no repite el precio por unidad si lleva una sola", () => {
    expect(mensajeDePedido(PEDIDO, UNO, new Prisma.Decimal("74.5"))).not.toContain("c/u");
  });
});

describe("el total", () => {
  it("aparece cuando hay varios productos", () => {
    expect(mensajeDePedido(PEDIDO, VARIOS, new Prisma.Decimal("194.3"))).toContain(
      "Son S/ 194.30 en total."
    );
  });

  it("aparece cuando lleva varias unidades de lo mismo", () => {
    const dos = [renglon("Velvet Musk", 2, "59.9")];

    expect(mensajeDePedido(PEDIDO, dos, new Prisma.Decimal("119.8"))).toContain(
      "Son S/ 119.80 en total."
    );
  });

  // Con un solo producto el total ya está a la vista en su renglón.
  it("se omite cuando sería el mismo número de arriba", () => {
    expect(mensajeDePedido(PEDIDO, UNO, new Prisma.Decimal("74.5"))).not.toContain("en total");
  });
});

describe("lo que no lleva", () => {
  it("lleva el número de pedido, para poder buscarlo después", () => {
    expect(mensajeDePedido(PEDIDO, UNO, new Prisma.Decimal("74.5"))).toContain("Pedido #5e24fa01");
  });

  // El detalle del Yape ya está en la pantalla; acá quedaban unos paréntesis
  // vacíos cuando el número no estaba configurado.
  it("no repite los datos del Yape", () => {
    expect(mensajeDePedido(PEDIDO, UNO, new Prisma.Decimal("74.5")).toLowerCase()).not.toContain(
      "yape"
    );
  });

  it("no le pide el comprobante a nadie", () => {
    expect(mensajeDePedido(PEDIDO, UNO, new Prisma.Decimal("74.5")).toLowerCase()).not.toContain(
      "comprobante"
    );
  });
});

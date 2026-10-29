import { describe, expect, it } from "vitest";
import { createCategorySchema } from "@/schemas/category.schema";
import { checkoutSchema } from "@/schemas/checkout.schema";
import {
  actualizarProductoSchema,
  adjustStockSchema,
  createProductSchema,
  crearProductoSchema,
} from "@/schemas/product.schema";

describe("createCategorySchema", () => {
  it("acepta datos válidos", () => {
    const result = createCategorySchema.safeParse({ name: "Perfumes", slug: "perfumes" });
    expect(result.success).toBe(true);
  });

  it("rechaza un slug con mayúsculas o espacios", () => {
    const result = createCategorySchema.safeParse({ name: "Perfumes", slug: "Perfumes Finos" });
    expect(result.success).toBe(false);
  });
});

describe("createProductSchema", () => {
  const base = {
    name: "Bleu Nocturne",
    slug: "bleu-nocturne",
    description: "Fragancia amaderada",
    price: 89.9,
    sku: "PERF-001",
    categoryId: "550e8400-e29b-41d4-a716-446655440000",
  };

  it("acepta datos válidos y aplica defaults", () => {
    const result = createProductSchema.parse(base);
    expect(result.stock).toBe(0);
    expect(result.isActive).toBe(true);
    expect(result.images).toEqual([]);
  });

  it("rechaza precio negativo", () => {
    const result = createProductSchema.safeParse({ ...base, price: -10 });
    expect(result.success).toBe(false);
  });

  it("rechaza categoryId que no es UUID", () => {
    const result = createProductSchema.safeParse({ ...base, categoryId: "no-es-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("adjustStockSchema", () => {
  it("rechaza un cambio de 0", () => {
    const result = adjustStockSchema.safeParse({ change: 0, reason: "restock" });
    expect(result.success).toBe(false);
  });

  it("acepta un cambio negativo con razón válida", () => {
    const result = adjustStockSchema.safeParse({ change: -3, reason: "manual_adjustment" });
    expect(result.success).toBe(true);
  });
});

describe("ofertas en el producto", () => {
  const base = {
    name: "Oud Real",
    slug: "oud-real",
    description: "Una fragancia",
    price: 200,
    sku: "OUD-1",
    categoryId: "550e8400-e29b-41d4-a716-446655440000",
  };

  it("acepta un producto sin oferta", () => {
    expect(crearProductoSchema.safeParse(base).success).toBe(true);
  });

  it("acepta una oferta con sus fechas", () => {
    const resultado = crearProductoSchema.safeParse({
      ...base,
      offerPrice: 150,
      offerStartsAt: "2026-06-10",
      offerEndsAt: "2026-06-20",
    });

    expect(resultado.success).toBe(true);
  });

  // Una "oferta" más cara encarece el producto sin que nadie lo note.
  it("rechaza un precio de oferta mayor al normal", () => {
    expect(crearProductoSchema.safeParse({ ...base, offerPrice: 250 }).success).toBe(false);
  });

  it("rechaza que la oferta termine antes de empezar", () => {
    const resultado = crearProductoSchema.safeParse({
      ...base,
      offerPrice: 150,
      offerStartsAt: "2026-06-20",
      offerEndsAt: "2026-06-10",
    });

    expect(resultado.success).toBe(false);
  });

  // Fechas sin precio no descuentan nada: es una oferta a medio cargar.
  it("rechaza fechas sin precio de oferta", () => {
    expect(
      crearProductoSchema.safeParse({ ...base, offerStartsAt: "2026-06-10" }).success
    ).toBe(false);
  });

  it("al editar, sacar la oferta es mandar el precio en null", () => {
    const resultado = actualizarProductoSchema.safeParse({ offerPrice: null });
    expect(resultado.success).toBe(true);
  });
});

describe("el documento en el pedido", () => {
  const base = {
    nombre: "Ana Torres",
    correo: "ana@gmail.com",
    celular: "999111222",
    metodoPago: "YAPE" as const,
    entrega: "RECOJO" as const,
  };

  it("acepta un DNI peruano", () => {
    expect(checkoutSchema.safeParse({ ...base, dni: "70123456" }).success).toBe(true);
  });

  // Exigir ocho dígitos dejaría afuera a quien tiene carnet de extranjería.
  it("acepta un carnet de extranjería con letras", () => {
    expect(checkoutSchema.safeParse({ ...base, dni: "CE1234567" }).success).toBe(true);
  });

  it("rechaza uno demasiado corto", () => {
    expect(checkoutSchema.safeParse({ ...base, dni: "123" }).success).toBe(false);
  });

  it("rechaza uno con puntos o guiones", () => {
    expect(checkoutSchema.safeParse({ ...base, dni: "70.123.456" }).success).toBe(false);
  });

  it("no deja hacer el pedido sin documento", () => {
    expect(checkoutSchema.safeParse(base).success).toBe(false);
  });
});

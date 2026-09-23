import { describe, expect, it } from "vitest";
import { createCategorySchema } from "@/schemas/category.schema";
import { adjustStockSchema, createProductSchema } from "@/schemas/product.schema";

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

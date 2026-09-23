import { describe, expect, it, vi, afterEach } from "vitest";
import { productService } from "@/services/product.service";
import { productRepository, StockUnderflowError } from "@/repositories/product.repository";
import { categoryService } from "@/services/category.service";

afterEach(() => {
  vi.restoreAllMocks();
});

const productId = "660e8400-e29b-41d4-a716-446655440001";
const categoryId = "550e8400-e29b-41d4-a716-446655440000";

describe("productService.create", () => {
  const input = {
    name: "Bleu Nocturne",
    slug: "bleu-nocturne",
    description: "Fragancia amaderada",
    price: 89.9,
    sku: "PERF-001",
    stock: 10,
    images: [],
    attributes: {},
    isActive: true,
    categoryId,
  };

  it("rechaza con 409 si el slug ya existe", async () => {
    vi.spyOn(categoryService, "getByIdOrSlug").mockResolvedValue({ id: categoryId } as never);
    vi.spyOn(productRepository, "findBySlug").mockResolvedValue({ id: "otro" } as never);
    vi.spyOn(productRepository, "findBySku").mockResolvedValue(null);

    await expect(productService.create(input)).rejects.toMatchObject({ status: 409 });
  });

  it("crea el producto cuando slug y sku están libres", async () => {
    vi.spyOn(categoryService, "getByIdOrSlug").mockResolvedValue({ id: categoryId } as never);
    vi.spyOn(productRepository, "findBySlug").mockResolvedValue(null);
    vi.spyOn(productRepository, "findBySku").mockResolvedValue(null);
    const created = { id: productId, ...input };
    vi.spyOn(productRepository, "create").mockResolvedValue(created as never);

    const result = await productService.create(input);

    expect(result).toEqual(created);
  });
});

describe("productService.adjustStock", () => {
  it("emite el evento de stock con el valor actualizado", async () => {
    vi.spyOn(productRepository, "findById").mockResolvedValue({ id: productId } as never);
    vi.spyOn(productRepository, "adjustStock").mockResolvedValue({
      id: productId,
      stock: 15,
    } as never);
    const emit = vi.fn();

    await productService.adjustStock(productId, 5, "restock", emit);

    expect(emit).toHaveBeenCalledWith({ productId, stock: 15 });
  });

  it("convierte un StockUnderflowError en un ApiError 409", async () => {
    vi.spyOn(productRepository, "findById").mockResolvedValue({ id: productId } as never);
    vi.spyOn(productRepository, "adjustStock").mockRejectedValue(
      new StockUnderflowError(2, -5)
    );

    await expect(
      productService.adjustStock(productId, -5, "manual_adjustment")
    ).rejects.toMatchObject({ status: 409 });
  });
});

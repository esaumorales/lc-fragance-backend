import { productRepository, StockUnderflowError } from "@/repositories/product.repository";
import { categoryService } from "@/services/category.service";
import type {
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from "@/schemas/product.schema";
import { ApiError } from "@/middlewares/error-handler";

// El emisor de stock es opcional: los tests unitarios llaman al servicio sin
// socket real, y acá simplemente no se emite nada.
export type StockEmitter = (payload: { productId: string; stock: number }) => void;

export const productService = {
  list(query: ListProductsQuery) {
    return productRepository.findMany(query);
  },

  async getBySlug(slug: string) {
    const product = await productRepository.findBySlug(slug);
    if (!product || !product.isActive) {
      throw new ApiError(404, "Producto no encontrado");
    }
    return product;
  },

  async getById(id: string) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new ApiError(404, "Producto no encontrado");
    }
    return product;
  },

  async create(data: CreateProductInput) {
    await categoryService.getByIdOrSlug(data.categoryId);

    const [bySlug, bySku] = await Promise.all([
      productRepository.findBySlug(data.slug),
      productRepository.findBySku(data.sku),
    ]);

    if (bySlug) throw new ApiError(409, "Ya existe un producto con ese slug");
    if (bySku) throw new ApiError(409, "Ya existe un producto con ese SKU");

    return productRepository.create(data);
  },

  async update(id: string, data: UpdateProductInput) {
    await this.getById(id);

    if (data.categoryId) {
      await categoryService.getByIdOrSlug(data.categoryId);
    }

    return productRepository.update(id, data);
  },

  async remove(id: string) {
    await this.getById(id);
    await productRepository.delete(id);
  },

  async adjustStock(
    id: string,
    change: number,
    reason: "restock" | "manual_adjustment",
    emit?: StockEmitter
  ) {
    await this.getById(id);

    try {
      const product = await productRepository.adjustStock(id, change, reason);
      emit?.({ productId: product.id, stock: product.stock });
      return product;
    } catch (error) {
      if (error instanceof StockUnderflowError) {
        throw new ApiError(409, error.message);
      }
      throw error;
    }
  },
};

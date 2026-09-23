import { categoryRepository } from "@/repositories/category.repository";
import type { CreateCategoryInput, UpdateCategoryInput } from "@/schemas/category.schema";
import { ApiError } from "@/middlewares/error-handler";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export const categoryService = {
  listAll() {
    return categoryRepository.findAll();
  },

  async getByIdOrSlug(idOrSlug: string) {
    const category = isUuid(idOrSlug)
      ? await categoryRepository.findById(idOrSlug)
      : await categoryRepository.findBySlug(idOrSlug);

    if (!category) {
      throw new ApiError(404, "Categoría no encontrada");
    }

    return category;
  },

  async create(data: CreateCategoryInput) {
    const existing = await categoryRepository.findBySlug(data.slug);
    if (existing) {
      throw new ApiError(409, "Ya existe una categoría con ese slug");
    }

    return categoryRepository.create(data);
  },

  async update(id: string, data: UpdateCategoryInput) {
    await this.getByIdOrSlug(id);

    if (data.slug) {
      const existing = await categoryRepository.findBySlug(data.slug);
      if (existing && existing.id !== id) {
        throw new ApiError(409, "Ya existe una categoría con ese slug");
      }
    }

    return categoryRepository.update(id, data);
  },

  async remove(id: string) {
    await this.getByIdOrSlug(id);

    const productCount = await categoryRepository.countProducts(id);
    if (productCount > 0) {
      throw new ApiError(409, "No se puede eliminar una categoría con productos asociados");
    }

    await categoryRepository.delete(id);
  },
};

import { categoryRepository } from "@/repositories/category.repository";
import { contarConDescendientes } from "@/lib/arbol-categorias";
import type { CreateCategoryInput, UpdateCategoryInput } from "@/schemas/category.schema";
import { ApiError } from "@/middlewares/error-handler";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export const categoryService = {
  /**
   * El listado lleva `productCount`, que incluye a las subcategorias.
   *
   * Lo usa el menu del sitio para no ofrecer una categoria vacia: un enlace
   * a una seccion sin nada es una puerta a un cartel de "no hay productos".
   */
  async listAll() {
    const categorias = await categoryRepository.findAll();
    const totales = contarConDescendientes(
      categorias.map((c) => ({ id: c.id, parentId: c.parentId, propios: c._count.products }))
    );

    return categorias.map(({ _count, ...categoria }) => ({
      ...categoria,
      productCount: totales.get(categoria.id) ?? 0,
    }));
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

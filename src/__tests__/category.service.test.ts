import { describe, expect, it, vi, afterEach } from "vitest";
import { categoryService } from "@/services/category.service";
import { categoryRepository } from "@/repositories/category.repository";
import { ApiError } from "@/middlewares/error-handler";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("categoryService.create", () => {
  it("crea la categoría cuando el slug está libre", async () => {
    vi.spyOn(categoryRepository, "findBySlug").mockResolvedValue(null);
    const created = { id: "cat-1", name: "Perfumes", slug: "perfumes", parentId: null };
    vi.spyOn(categoryRepository, "create").mockResolvedValue(created as never);

    const result = await categoryService.create({ name: "Perfumes", slug: "perfumes" });

    expect(result).toEqual(created);
  });

  it("lanza 409 si el slug ya existe", async () => {
    vi.spyOn(categoryRepository, "findBySlug").mockResolvedValue({ id: "cat-1" } as never);

    await expect(
      categoryService.create({ name: "Perfumes", slug: "perfumes" })
    ).rejects.toMatchObject({ status: 409 } satisfies Partial<ApiError>);
  });
});

describe("categoryService.remove", () => {
  // isUuid() decide si getByIdOrSlug busca por id o por slug; se usa un UUID
  // real para que el servicio consulte por findById, como en producción.
  const categoryId = "550e8400-e29b-41d4-a716-446655440000";

  it("lanza 409 si la categoría tiene productos asociados", async () => {
    vi.spyOn(categoryRepository, "findById").mockResolvedValue({ id: categoryId } as never);
    vi.spyOn(categoryRepository, "countProducts").mockResolvedValue(3);

    await expect(categoryService.remove(categoryId)).rejects.toMatchObject({ status: 409 });
  });

  it("elimina la categoría cuando no tiene productos", async () => {
    vi.spyOn(categoryRepository, "findById").mockResolvedValue({ id: categoryId } as never);
    vi.spyOn(categoryRepository, "countProducts").mockResolvedValue(0);
    const deleteSpy = vi.spyOn(categoryRepository, "delete").mockResolvedValue({} as never);

    await categoryService.remove(categoryId);

    expect(deleteSpy).toHaveBeenCalledWith(categoryId);
  });
});

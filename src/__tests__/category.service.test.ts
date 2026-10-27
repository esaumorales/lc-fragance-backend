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

describe("categoryService.listAll", () => {
  function conProductos(filas: { id: string; parentId: string | null; propios: number }[]) {
    vi.spyOn(categoryRepository, "findAll").mockResolvedValue(
      filas.map((f) => ({
        id: f.id,
        name: f.id,
        slug: f.id,
        parentId: f.parentId,
        _count: { products: f.propios },
      })) as never
    );
  }

  it("devuelve cuántos productos tiene cada categoría", async () => {
    conProductos([
      { id: "perfumes", parentId: null, propios: 12 },
      { id: "tecnologia", parentId: null, propios: 0 },
    ]);

    const resultado = await categoryService.listAll();

    expect(resultado).toEqual([
      { id: "perfumes", name: "perfumes", slug: "perfumes", parentId: null, productCount: 12 },
      { id: "tecnologia", name: "tecnologia", slug: "tecnologia", parentId: null, productCount: 0 },
    ]);
  });

  // Un padre sin productos propios pero con subcategorías llenas sí tiene
  // stock: contar solo los propios lo borraría del menú.
  it("al padre le suma lo que hay en sus subcategorías", async () => {
    conProductos([
      { id: "tecnologia", parentId: null, propios: 0 },
      { id: "audio", parentId: "tecnologia", propios: 4 },
      { id: "auriculares", parentId: "audio", propios: 3 },
    ]);

    const porId = new Map((await categoryService.listAll()).map((c) => [c.id, c.productCount]));

    expect(porId.get("tecnologia")).toBe(7);
    expect(porId.get("audio")).toBe(7);
    expect(porId.get("auriculares")).toBe(3);
  });

  it("no deja rastro del conteo interno de Prisma", async () => {
    conProductos([{ id: "perfumes", parentId: null, propios: 2 }]);

    const [categoria] = await categoryService.listAll();

    expect(categoria).not.toHaveProperty("_count");
  });

  it("aguanta que no haya ninguna categoría", async () => {
    conProductos([]);
    await expect(categoryService.listAll()).resolves.toEqual([]);
  });
});

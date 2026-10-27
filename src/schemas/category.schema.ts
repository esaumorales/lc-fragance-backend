import { z } from "@/lib/zod-openapi";

export const categorySchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    parentId: z.string().uuid().nullable(),
  })
  .openapi("Category");

// El listado agrega el conteo; la ficha suelta no, porque sumar los
// descendientes necesita el arbol entero.
export const categoryWithCountSchema = categorySchema
  .extend({ productCount: z.number().int().nonnegative() })
  .openapi("CategoryWithCount");

export const createCategorySchema = z
  .object({
    name: z.string().min(2).max(80),
    slug: z
      .string()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug inválido: usar minúsculas, números y guiones"),
    parentId: z.string().uuid().optional(),
  })
  .openapi("CreateCategory");

export const updateCategorySchema = createCategorySchema.partial().openapi("UpdateCategory");

export const categoryParamsSchema = z.object({
  idOrSlug: z.string(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

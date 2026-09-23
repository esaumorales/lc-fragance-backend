import { z } from "@/lib/zod-openapi";

export const productSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    description: z.string(),
    price: z.string(),
    sku: z.string(),
    stock: z.number().int(),
    images: z.array(z.string().url()),
    model3dUrl: z.string().url().nullable(),
    attributes: z.record(z.string(), z.unknown()),
    isActive: z.boolean(),
    categoryId: z.string().uuid(),
  })
  .openapi("Product");

export const createProductSchema = z
  .object({
    name: z.string().min(2).max(160),
    slug: z
      .string()
      .min(2)
      .max(160)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug inválido: usar minúsculas, números y guiones"),
    description: z.string().min(1),
    price: z.number().positive(),
    sku: z.string().min(1).max(64),
    stock: z.number().int().min(0).default(0),
    images: z.array(z.string().url()).default([]),
    model3dUrl: z.string().url().optional(),
    attributes: z.record(z.string(), z.unknown()).default({}),
    isActive: z.boolean().default(true),
    categoryId: z.string().uuid(),
  })
  .openapi("CreateProduct");

export const updateProductSchema = createProductSchema.partial().openapi("UpdateProduct");

export const adjustStockSchema = z
  .object({
    change: z.number().int().refine((value) => value !== 0, "El cambio no puede ser 0"),
    reason: z.enum(["restock", "manual_adjustment"]),
  })
  .openapi("AdjustStock");

export const productSortSchema = z
  .enum(["recientes", "precio-asc", "precio-desc", "nombre"])
  .default("recientes");

export const listProductsQuerySchema = z.object({
  category: z.string().optional(),
  /** Busqueda libre sobre nombre y descripcion. */
  q: z.string().trim().min(1).max(80).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  /** Solo productos con stock disponible. */
  inStock: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  sort: productSortSchema,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type ProductSort = z.infer<typeof productSortSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

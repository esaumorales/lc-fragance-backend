import { z } from "@/lib/zod-openapi";
import { registry } from "@/docs/registry";
import {
  adjustStockSchema,
  createProductSchema,
  productSchema,
  updateProductSchema,
} from "@/schemas/product.schema";

const errorSchema = z.object({ error: z.string() });

const paginatedProductsSchema = z.object({
  items: z.array(productSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

registry.registerPath({
  method: "get",
  path: "/products",
  summary: "Listar productos (con filtro por categoría y paginación)",
  tags: ["Products"],
  request: {
    query: z.object({
      category: z.string().optional(),
      page: z.string().optional(),
      pageSize: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Página de productos",
      content: { "application/json": { schema: paginatedProductsSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/products/{slug}",
  summary: "Obtener un producto por slug",
  tags: ["Products"],
  request: { params: z.object({ slug: z.string() }) },
  responses: {
    200: {
      description: "Producto encontrado",
      content: { "application/json": { schema: productSchema } },
    },
    404: {
      description: "Producto no encontrado",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/products",
  summary: "Crear un producto (admin)",
  tags: ["Products"],
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { "application/json": { schema: createProductSchema } } },
  },
  responses: {
    201: {
      description: "Producto creado",
      content: { "application/json": { schema: productSchema } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/products/{id}",
  summary: "Actualizar un producto (admin)",
  tags: ["Products"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: updateProductSchema } } },
  },
  responses: {
    200: {
      description: "Producto actualizado",
      content: { "application/json": { schema: productSchema } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/products/{id}",
  summary: "Eliminar un producto (admin)",
  tags: ["Products"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    204: { description: "Producto eliminado" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/products/{id}/stock",
  summary: "Ajustar stock de un producto (admin) - emite stock:updated por socket",
  tags: ["Products"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: adjustStockSchema } } },
  },
  responses: {
    200: {
      description: "Stock ajustado",
      content: { "application/json": { schema: productSchema } },
    },
    409: {
      description: "Stock insuficiente para el ajuste solicitado",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

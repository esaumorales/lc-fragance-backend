import { z } from "@/lib/zod-openapi";
import { registry } from "@/docs/registry";
import { categorySchema, createCategorySchema, updateCategorySchema } from "@/schemas/category.schema";

const errorSchema = z.object({ error: z.string() });

registry.registerPath({
  method: "get",
  path: "/categories",
  summary: "Listar categorías",
  tags: ["Categories"],
  responses: {
    200: {
      description: "Lista de categorías",
      content: { "application/json": { schema: z.array(categorySchema) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/categories/{idOrSlug}",
  summary: "Obtener una categoría por id o slug",
  tags: ["Categories"],
  request: { params: z.object({ idOrSlug: z.string() }) },
  responses: {
    200: {
      description: "Categoría encontrada",
      content: { "application/json": { schema: categorySchema } },
    },
    404: {
      description: "Categoría no encontrada",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/categories",
  summary: "Crear una categoría (admin)",
  tags: ["Categories"],
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { "application/json": { schema: createCategorySchema } } },
  },
  responses: {
    201: {
      description: "Categoría creada",
      content: { "application/json": { schema: categorySchema } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/categories/{id}",
  summary: "Actualizar una categoría (admin)",
  tags: ["Categories"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: updateCategorySchema } } },
  },
  responses: {
    200: {
      description: "Categoría actualizada",
      content: { "application/json": { schema: categorySchema } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/categories/{id}",
  summary: "Eliminar una categoría (admin)",
  tags: ["Categories"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    204: { description: "Categoría eliminada" },
  },
});

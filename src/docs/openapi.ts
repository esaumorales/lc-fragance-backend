import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { z } from "@/lib/zod-openapi";
import { registry } from "@/docs/registry";

registry.registerPath({
  method: "get",
  path: "/api/health",
  summary: "Health check",
  responses: {
    200: {
      description: "El servicio está arriba",
      content: {
        "application/json": {
          schema: z.object({
            status: z.literal("ok"),
            timestamp: z.string(),
          }),
        },
      },
    },
  },
});

// Efecto secundario: cada módulo registra sus rutas en `registry` al importarse.
import "@/docs/category.docs";
import "@/docs/product.docs";
import "@/docs/auth.docs";
import "@/docs/cart.docs";
import "@/docs/checkout.docs";

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Lyon Call API",
      version: "0.1.0",
      description: "API de la tienda Lyon Call (perfumes árabes y de diseñador, y a futuro otras categorías).",
    },
    servers: [{ url: "/api" }],
  });
}

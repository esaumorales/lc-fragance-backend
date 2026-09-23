import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";

// Registro central de OpenAPI. Cada módulo de rutas (categories, products...)
// agrega sus schemas/paths acá al importarse, así la doc en /docs siempre
// refleja el código real en vez de mantenerse a mano.
export const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

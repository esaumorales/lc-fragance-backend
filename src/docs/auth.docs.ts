import { z } from "@/lib/zod-openapi";
import { registry } from "@/docs/registry";
import { authResponseSchema, authUserSchema, loginSchema, registerSchema } from "@/schemas/auth.schema";

const errorSchema = z.object({ error: z.string() });

registry.registerPath({
  method: "post",
  path: "/auth/register",
  summary: "Crear una cuenta",
  tags: ["Auth"],
  request: { body: { content: { "application/json": { schema: registerSchema } } } },
  responses: {
    201: {
      description: "Cuenta creada, sesión iniciada (refresh token en cookie httpOnly)",
      content: { "application/json": { schema: authResponseSchema } },
    },
    409: {
      description: "El correo ya está registrado",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/login",
  summary: "Iniciar sesión",
  tags: ["Auth"],
  request: { body: { content: { "application/json": { schema: loginSchema } } } },
  responses: {
    200: {
      description: "Sesión iniciada",
      content: { "application/json": { schema: authResponseSchema } },
    },
    401: {
      description: "Credenciales inválidas",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/refresh",
  summary: "Renovar el access token usando el refresh token (cookie httpOnly)",
  tags: ["Auth"],
  responses: {
    200: {
      description: "Nuevo access token",
      content: { "application/json": { schema: authResponseSchema } },
    },
    401: {
      description: "No hay sesión activa o el refresh token es inválido",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/logout",
  summary: "Cerrar sesión (revoca el refresh token)",
  tags: ["Auth"],
  responses: { 204: { description: "Sesión cerrada" } },
});

registry.registerPath({
  method: "get",
  path: "/auth/me",
  summary: "Usuario autenticado actual",
  tags: ["Auth"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Usuario actual",
      content: { "application/json": { schema: z.object({ user: authUserSchema }) } },
    },
  },
});

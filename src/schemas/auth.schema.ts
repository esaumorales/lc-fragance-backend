import { z } from "@/lib/zod-openapi";

export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8).max(72),
  })
  .openapi("Register");

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1),
  })
  .openapi("Login");

export const authUserSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    role: z.enum(["CUSTOMER", "ADMIN"]),
  })
  .openapi("AuthUser");

export const authResponseSchema = z
  .object({
    accessToken: z.string(),
    user: authUserSchema,
  })
  .openapi("AuthResponse");

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

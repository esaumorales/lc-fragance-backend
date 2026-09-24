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
    role: z.enum(["CUSTOMER", "ADMIN", "SUPERADMIN"]),
  })
  .openapi("AuthUser");

export const authResponseSchema = z
  .object({
    accessToken: z.string(),
    user: authUserSchema,
  })
  .openapi("AuthResponse");

// Un admin no recibe tokens al acertar la contraseña: recibe este desafio y
// lo completa con el codigo que le llega al correo.
export const desafioResponseSchema = z
  .object({
    requiereCodigo: z.literal(true),
    desafioId: z.string().uuid(),
    correoEnviado: z.boolean(),
  })
  .openapi("DesafioSegundoFactor");

export const verificarCodigoSchema = z
  .object({
    desafioId: z.string().uuid(),
    codigo: z.string().trim().regex(/^\d{6}$/, "El código tiene seis dígitos"),
  })
  .openapi("VerificarCodigo");

export const olvideSchema = z
  .object({ email: z.string().trim().toLowerCase().email() })
  .openapi("OlvideContrasena");

export const restablecerSchema = z
  .object({
    token: z.string().min(20),
    password: z.string().min(8).max(72),
  })
  .openapi("RestablecerContrasena");

export const actualizarPerfilSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    // Solo hace falta para cambiar el correo: con una sesion robada, si no,
    // alcanzaria con cambiarlo para quedarse con la cuenta.
    password: z.string().min(1).optional(),
  })
  .refine((d) => d.name !== undefined || d.email !== undefined, {
    message: "No hay nada que cambiar",
  })
  .openapi("ActualizarPerfil");

export const cambiarClaveSchema = z
  .object({
    actual: z.string().min(1),
    nueva: z.string().min(8).max(72),
  })
  .openapi("CambiarClave");

export type ActualizarPerfilInput = z.infer<typeof actualizarPerfilSchema>;
export type CambiarClaveInput = z.infer<typeof cambiarClaveSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerificarCodigoInput = z.infer<typeof verificarCodigoSchema>;
export type OlvideInput = z.infer<typeof olvideSchema>;
export type RestablecerInput = z.infer<typeof restablecerSchema>;

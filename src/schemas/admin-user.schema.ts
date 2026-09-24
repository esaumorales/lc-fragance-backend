import { z } from "@/lib/zod-openapi";

// Solo se dan de alta roles del panel: un cliente se registra por su cuenta.
const rolDePanel = z.enum(["ADMIN", "SUPERADMIN"]);

export const crearAdminSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email(),
    role: rolDePanel.default("ADMIN"),
  })
  .openapi("CrearAdmin");

export const actualizarAdminSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    role: rolDePanel.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((datos) => Object.keys(datos).length > 0, {
    message: "No hay nada que cambiar",
  })
  .openapi("ActualizarAdmin");

// El listado admite filtrar por rol; sin filtro vienen todas las cuentas.
export const filtroDeUsuariosSchema = z.enum(["CUSTOMER", "ADMIN", "SUPERADMIN"]);

export const adminSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    role: rolDePanel,
    isActive: z.boolean(),
    createdAt: z.string(),
  })
  .openapi("Admin");

export type CrearAdminInput = z.infer<typeof crearAdminSchema>;
export type ActualizarAdminInput = z.infer<typeof actualizarAdminSchema>;

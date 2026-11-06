import { z } from "@/lib/zod-openapi";
import { motivoDelTelefono } from "@/lib/telefono";

// Un campo vacio se guarda como null y no como "": asi "sin Yape" es una
// sola cosa y no dos que hay que contemplar en cada comparacion.
const texto = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((valor) => valor || null)
    .nullable()
    .optional();

export const guardarConfiguracionPagoSchema = z
  .object({
    titular: texto(120),
    yape: texto(20),
    banco: texto(60),
    cuenta: texto(40),
    cci: texto(40),
    // Se valida aca y no solo en la pantalla: un numero sin codigo de pais
    // arma un enlace que no abre ningun chat, y el fallo se descubre recien
    // cuando un cliente no puede escribir.
    whatsapp: texto(20).refine((valor) => !valor || motivoDelTelefono(valor) === null, {
      message: "Falta el código del país. Por ejemplo: +51 974 732 528",
    }),
    correoDeAvisos: z
      .string()
      .trim()
      .toLowerCase()
      .email()
      .nullable()
      .optional()
      .or(z.literal("").transform(() => null)),
    recojoActivo: z.boolean().optional(),
    deliveryActivo: z.boolean().optional(),
    costoDelivery: z.number().nonnegative().max(9999).optional(),
  })
  .openapi("GuardarConfiguracionPago");

export const configuracionPagoPublicaSchema = z
  .object({
    titular: z.string().nullable(),
    yape: z.string().nullable(),
    banco: z.string().nullable(),
    cuenta: z.string().nullable(),
    cci: z.string().nullable(),
    metodos: z.array(z.enum(["YAPE", "TRANSFERENCIA"])),
    entregas: z.array(z.enum(["RECOJO", "DELIVERY"])),
    costoDelivery: z.string(),
    /** Null cuando se puede comprar; si no, por que no. */
    motivo: z.string().nullable(),
  })
  .openapi("ConfiguracionPagoPublica");

export type GuardarConfiguracionPagoInput = z.infer<typeof guardarConfiguracionPagoSchema>;

import "dotenv/config";
import { parsearOrigenes } from "@/lib/cors-origen";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  // CLIENT_URL admite varios origenes separados por coma: produccion, las
  // vistas previas de Vercel y el localhost de desarrollo.
  clientUrls: parsearOrigenes(required("CLIENT_URL", "http://localhost:3000")),

  databaseUrl: required("DATABASE_URL"),

  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET"),
    refreshSecret: required("JWT_REFRESH_SECRET"),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY ?? "",
    emailFrom: process.env.EMAIL_FROM ?? "LC Fragance <no-reply@lcfragance.com>",
  },

  // Checkout sin pasarela de pago: el pedido se cierra por WhatsApp/Yape.
  checkout: {
    whatsappPhone: process.env.WHATSAPP_PHONE ?? "",
    yapePhone: process.env.YAPE_PHONE ?? "",
    yapeName: process.env.YAPE_NAME ?? "LC Fragance",
  },
};

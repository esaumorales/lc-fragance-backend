import { createHash } from "crypto";
import { env } from "@/config/env";
import { ApiError } from "@/middlewares/error-handler";

// Todas las imagenes del catalogo viven bajo la misma carpeta en Cloudinary.
const CARPETA = "lc-fragance/productos";

export type FirmaSubida = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
};

/**
 * Firma una subida directa a Cloudinary.
 *
 * El navegador sube el archivo a Cloudinary con esta firma, asi el api secret
 * nunca sale del servidor y los archivos grandes no pasan por el backend.
 */
export const uploadService = {
  firmar(): FirmaSubida {
    const { cloudName, apiKey, apiSecret } = env.cloudinary;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new ApiError(503, "Cloudinary no está configurado en el servidor");
    }

    const timestamp = Math.floor(Date.now() / 1000);

    // Cloudinary espera los parametros ordenados alfabeticamente y unidos por
    // "&", con el api secret pegado al final antes de hashear.
    const params: Record<string, string> = {
      folder: CARPETA,
      timestamp: String(timestamp),
    };
    const base = Object.keys(params)
      .sort()
      .map((clave) => `${clave}=${params[clave]}`)
      .join("&");

    const signature = createHash("sha1").update(base + apiSecret).digest("hex");

    return { cloudName, apiKey, timestamp, folder: CARPETA, signature };
  },
};

import { createHash } from "crypto";
import { env } from "@/config/env";
import { ApiError } from "@/middlewares/error-handler";

// Cada cosa en su carpeta: asi el comprobante de alguien no se mezcla con
// las fotos del catalogo ni se puede pisar una con la otra.
const CARPETAS = {
  productos: "lc-fragance/productos",
  vouchers: "lc-fragance/vouchers",
} as const;

export type Destino = keyof typeof CARPETAS;

/** 10 MB. El aviso solo aparece cuando alguien lo pasa. */
export const MAXIMO_DEL_VOUCHER = 10 * 1024 * 1024;

export type FirmaSubida = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  /** Lo que el navegador tiene que respetar antes de subir. */
  maximoBytes: number;
  formatos: string[];
};

/**
 * Firma una subida directa a Cloudinary.
 *
 * El navegador sube el archivo a Cloudinary con esta firma, asi el api secret
 * nunca sale del servidor y los archivos grandes no pasan por el backend.
 */
export const uploadService = {
  firmar(destino: Destino = "productos"): FirmaSubida {
    const { cloudName, apiKey, apiSecret } = env.cloudinary;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new ApiError(503, "Cloudinary no está configurado en el servidor");
    }

    const timestamp = Math.floor(Date.now() / 1000);

    // Cloudinary espera los parametros ordenados alfabeticamente y unidos por
    // "&", con el api secret pegado al final antes de hashear.
    const carpeta = CARPETAS[destino];
    const params: Record<string, string> = {
      folder: carpeta,
      timestamp: String(timestamp),
    };
    const base = Object.keys(params)
      .sort()
      .map((clave) => `${clave}=${params[clave]}`)
      .join("&");

    const signature = createHash("sha1").update(base + apiSecret).digest("hex");

    return {
      cloudName,
      apiKey,
      timestamp,
      folder: carpeta,
      signature,
      maximoBytes: MAXIMO_DEL_VOUCHER,
      formatos: ["jpg", "jpeg", "png", "webp", "heic", "pdf"],
    };
  },
};

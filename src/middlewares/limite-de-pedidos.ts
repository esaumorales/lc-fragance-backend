import type { NextFunction, Request, Response } from "express";
import { LimitePorIp, PEDIDOS_POR_DIA } from "@/lib/limite-por-ip";
import { ApiError } from "@/middlewares/error-handler";

const limite = new LimitePorIp();

// Cada tanto se tiran las IP que ya no tienen nada vigente: el mapa vive en
// memoria y sin esto crece con cada visitante que paso alguna vez.
const UNA_HORA = 60 * 60 * 1000;
setInterval(() => limite.limpiar(), UNA_HORA).unref();

/**
 * Tope de pedidos por IP.
 *
 * El checkout esta abierto a cualquiera, con cuenta o sin ella: sin un tope,
 * un script llena la tienda de pedidos falsos en un minuto. Cuenta pedidos,
 * no productos, asi que un carrito grande gasta uno solo.
 */
export function limiteDePedidos(req: Request, _res: Response, next: NextFunction) {
  const ip = req.ip ?? "desconocida";

  if (!limite.permite(ip)) {
    throw new ApiError(
      429,
      `Llegaste al máximo de ${PEDIDOS_POR_DIA} pedidos por día. Escribinos por WhatsApp y lo vemos.`
    );
  }

  next();
}

// Las firmas se piden antes de cada intento de subida, asi que el tope es mas
// alto que el de pedidos: alguien puede equivocarse de archivo un par de
// veces sin quedar bloqueado.
const limiteDeFirmas = new LimitePorIp(40);
setInterval(() => limiteDeFirmas.limpiar(), UNA_HORA).unref();

export function limiteDeVouchers(req: Request, _res: Response, next: NextFunction) {
  if (!limiteDeFirmas.permite(req.ip ?? "desconocida")) {
    throw new ApiError(429, "Demasiados intentos de subida. Probá más tarde.");
  }
  next();
}

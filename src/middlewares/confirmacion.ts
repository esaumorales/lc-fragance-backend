import type { NextFunction, Request, Response } from "express";
import { confirmacionService } from "@/services/confirmacion.service";
import { ApiError } from "@/middlewares/error-handler";

export const CABECERA_ID = "x-confirmacion-id";
export const CABECERA_CODIGO = "x-confirmacion-codigo";

/**
 * Exige un codigo de confirmacion para acciones que no se pueden deshacer.
 *
 * Viaja en cabeceras y no en el cuerpo para que sirva igual en DELETE, que no
 * siempre conserva el cuerpo al pasar por un proxy.
 *
 * Responde 428 cuando falta: es el codigo que el frontend usa para saber que
 * tiene que pedir la confirmacion, distinto de un 401 por codigo equivocado.
 */
export function requireConfirmacion(req: Request, _res: Response, next: NextFunction) {
  const id = req.header(CABECERA_ID);
  const codigo = req.header(CABECERA_CODIGO);

  if (!id || !codigo) {
    return next(new ApiError(428, "Esta acción necesita confirmación por código"));
  }

  confirmacionService
    .validar(req.user!.sub, id, codigo)
    .then(() => next())
    .catch(next);
}

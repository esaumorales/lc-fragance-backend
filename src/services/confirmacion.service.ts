import { authRepository } from "@/repositories/auth.repository";
import { ApiError } from "@/middlewares/error-handler";
import {
  MINUTOS_DE_VIGENCIA,
  generarCodigo,
  hashearCodigo,
  vencimientoDelCodigo,
  verificarCodigo,
} from "@/lib/codigo-verificacion";
import { emailService, plantillas } from "@/services/email.service";

/**
 * Confirmacion por codigo de una accion delicada, ya estando dentro.
 *
 * Es distinto del segundo factor de ingreso: aquel prueba quien entra, este
 * prueba que quien tiene la sesion abierta realmente quiso hacer algo que no
 * se puede deshacer, como eliminar una cuenta o cambiarle el correo.
 */
export const confirmacionService = {
  async pedir(userId: string) {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new ApiError(401, "Usuario no encontrado");
    }

    const codigo = generarCodigo();
    const desafio = await authRepository.createVerificationCode(
      user.id,
      hashearCodigo(codigo),
      vencimientoDelCodigo(),
      "ACTION"
    );

    const envio = await emailService.enviar({
      para: user.email,
      asunto: `Código para confirmar la acción: ${codigo}`,
      html: plantillas.codigoDeAccion(user.name, codigo, MINUTOS_DE_VIGENCIA),
    });

    // Sin correo configurado no habria forma de confirmar nada. Queda en el
    // log del servidor, donde solo llega quien ya tiene acceso a la maquina.
    if (!envio.enviado) {
      console.warn(
        `[confirmación] no se pudo enviar el correo (${envio.motivo}). ` +
          `Código para ${user.email}: ${codigo}`
      );
    }

    return { confirmacionId: desafio.id, correoEnviado: envio.enviado };
  },

  /** Valida el codigo y lo quema. Lanza si no sirve. */
  async validar(userId: string, confirmacionId: string, codigo: string) {
    const desafio = await authRepository.findVerificationCode(confirmacionId);

    // Tiene que ser de esta persona y de este proposito: un codigo de ingreso
    // no puede servir para autorizar una accion.
    if (!desafio || desafio.userId !== userId || desafio.purpose !== "ACTION") {
      throw new ApiError(401, "Código inválido");
    }

    const resultado = verificarCodigo(desafio, codigo);
    if (!resultado.valido) {
      if (resultado.motivo === "incorrecto") {
        await authRepository.registerFailedAttempt(desafio.id);
      }
      const mensajes = {
        usado: "Ese código ya se usó",
        vencido: "El código venció, pedí uno nuevo",
        "sin-intentos": "Demasiados intentos, pedí un código nuevo",
        incorrecto: "Código inválido",
      };
      throw new ApiError(401, mensajes[resultado.motivo]);
    }

    await authRepository.markCodeUsed(desafio.id);
  },
};

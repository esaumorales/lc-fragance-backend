import argon2 from "argon2";
import { randomBytes } from "crypto";
import { adminUserRepository } from "@/repositories/admin-user.repository";
import { authRepository } from "@/repositories/auth.repository";
import { ApiError } from "@/middlewares/error-handler";
import { puedeActualizar, puedeEliminar } from "@/lib/reglas-admin";
import { HORAS_DEL_ENLACE, armarUrlDeEnlace, generarTokenDeEnlace } from "@/services/auth.service";
import { emailService, plantillas } from "@/services/email.service";
import type { ActualizarAdminInput, CrearAdminInput } from "@/schemas/admin-user.schema";

// El alta no fija contraseña: se pone una al azar que nadie conoce y el invitado
// elige la suya con el enlace del correo.
async function contrasenaInutilizable(): Promise<string> {
  return argon2.hash(randomBytes(32).toString("hex"));
}

async function crearEnlace(userId: string, proposito: "INVITE" | "RESET") {
  const { token, tokenHash } = generarTokenDeEnlace();
  const vence = new Date(Date.now() + HORAS_DEL_ENLACE * 60 * 60 * 1000);
  await authRepository.createAccessLink(userId, tokenHash, proposito, vence);
  return armarUrlDeEnlace(token, proposito === "INVITE" ? "invitacion" : "restablecer");
}

export const adminUserService = {
  listar() {
    return adminUserRepository.listar();
  },

  async crear(data: CrearAdminInput) {
    const existente = await adminUserRepository.buscarPorEmail(data.email);
    if (existente) {
      throw new ApiError(409, "Ya existe una cuenta con ese correo");
    }

    const admin = await adminUserRepository.crear({
      name: data.name,
      email: data.email,
      role: data.role,
      password: await contrasenaInutilizable(),
    });

    const enlace = await crearEnlace(admin.id, "INVITE");
    const envio = await emailService.enviar({
      para: admin.email,
      asunto: "Te dieron acceso al panel de LC Fragance",
      html: plantillas.invitacion(admin.name, enlace, HORAS_DEL_ENLACE),
    });

    // Si el correo no salio, se devuelve el enlace para pasarlo a mano: crear
    // un admin no puede quedar bloqueado porque falte configurar Resend.
    return { admin, correoEnviado: envio.enviado, enlace: envio.enviado ? undefined : enlace };
  },

  async actualizar(actorId: string, id: string, cambios: ActualizarAdminInput) {
    const objetivo = await adminUserRepository.buscarPorId(id);
    if (!objetivo) {
      throw new ApiError(404, "No existe ese administrador");
    }

    const veredicto = puedeActualizar(
      actorId,
      objetivo,
      cambios,
      await adminUserRepository.contarSuperadminsActivos()
    );
    if (!veredicto.permitido) {
      throw new ApiError(409, veredicto.motivo);
    }

    const actualizado = await adminUserRepository.actualizar(id, cambios);

    // Suspender tiene que echar al suspendido de donde ya este entrado.
    if (cambios.isActive === false) {
      await authRepository.revokeAllRefreshTokens(id);
    }

    return actualizado;
  },

  async eliminar(actorId: string, id: string) {
    const objetivo = await adminUserRepository.buscarPorId(id);
    if (!objetivo) {
      throw new ApiError(404, "No existe ese administrador");
    }

    const veredicto = puedeEliminar(
      actorId,
      objetivo,
      await adminUserRepository.contarSuperadminsActivos()
    );
    if (!veredicto.permitido) {
      throw new ApiError(409, veredicto.motivo);
    }

    await adminUserRepository.eliminar(id);
  },

  async reenviarAcceso(id: string) {
    const admin = await adminUserRepository.buscarPorId(id);
    if (!admin) {
      throw new ApiError(404, "No existe ese administrador");
    }

    const enlace = await crearEnlace(admin.id, "RESET");
    const envio = await emailService.enviar({
      para: admin.email,
      asunto: "Restablecer tu contraseña",
      html: plantillas.restablecer(admin.name, enlace, HORAS_DEL_ENLACE),
    });

    return { correoEnviado: envio.enviado, enlace: envio.enviado ? undefined : enlace };
  },
};

import { afterEach, describe, expect, it, vi } from "vitest";
import { adminUserService } from "@/services/admin-user.service";
import { adminUserRepository } from "@/repositories/admin-user.repository";
import { authRepository } from "@/repositories/auth.repository";
import { emailService } from "@/services/email.service";

afterEach(() => {
  vi.restoreAllMocks();
});

const nuevo = {
  id: "990e8400-e29b-41d4-a716-446655440020",
  name: "Ayudante",
  email: "ayudante@example.com",
  role: "ADMIN" as const,
  isActive: true,
  createdAt: new Date(),
};

function prepararAlta() {
  vi.spyOn(adminUserRepository, "buscarPorEmail").mockResolvedValue(null);
  vi.spyOn(adminUserRepository, "crear").mockResolvedValue(nuevo as never);
  vi.spyOn(authRepository, "createAccessLink").mockResolvedValue({} as never);
}

describe("adminUserService.crear", () => {
  it("cuando el correo sale, no devuelve el enlace", async () => {
    prepararAlta();
    vi.spyOn(emailService, "enviar").mockResolvedValue({ enviado: true });

    const alta = await adminUserService.crear({
      name: nuevo.name,
      email: nuevo.email,
      role: "ADMIN",
    });

    expect(alta.correoEnviado).toBe(true);
    expect(alta.enlace).toBeUndefined();
    expect(alta.admin.email).toBe(nuevo.email);
  });

  // Sin dominio verificado, Resend solo entrega al titular de la cuenta. El
  // alta no puede fallar por eso: devuelve el enlace para pasarlo a mano.
  it("cuando el correo no sale, devuelve el enlace para pasarlo a mano", async () => {
    prepararAlta();
    vi.spyOn(emailService, "enviar").mockResolvedValue({
      enviado: false,
      motivo: "You can only send testing emails to your own email address",
    });

    const alta = await adminUserService.crear({
      name: nuevo.name,
      email: nuevo.email,
      role: "ADMIN",
    });

    expect(alta.correoEnviado).toBe(false);
    expect(alta.enlace).toContain("/invitacion?token=");
  });

  it("la contraseña inicial no es adivinable ni queda en la respuesta", async () => {
    prepararAlta();
    vi.spyOn(emailService, "enviar").mockResolvedValue({ enviado: true });
    const crear = vi.spyOn(adminUserRepository, "crear");

    const alta = await adminUserService.crear({
      name: nuevo.name,
      email: nuevo.email,
      role: "ADMIN",
    });

    // Se guarda un hash argon2 de algo aleatorio: nadie conoce esa clave, el
    // invitado elige la suya con el enlace.
    expect(crear.mock.calls[0]![0].password).toMatch(/^\$argon2/);
    expect(JSON.stringify(alta)).not.toContain("password");
  });

  it("rechaza con 409 si el correo ya tiene cuenta", async () => {
    vi.spyOn(adminUserRepository, "buscarPorEmail").mockResolvedValue({ id: "otro" } as never);

    await expect(
      adminUserService.crear({ name: "X", email: nuevo.email, role: "ADMIN" })
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("adminUserService.reenviarAcceso", () => {
  it("devuelve el enlace si el correo no sale", async () => {
    vi.spyOn(adminUserRepository, "buscarPorId").mockResolvedValue(nuevo as never);
    vi.spyOn(authRepository, "createAccessLink").mockResolvedValue({} as never);
    vi.spyOn(emailService, "enviar").mockResolvedValue({ enviado: false, motivo: "sin dominio" });

    const envio = await adminUserService.reenviarAcceso(nuevo.id);

    expect(envio.correoEnviado).toBe(false);
    expect(envio.enlace).toContain("/restablecer?token=");
  });

  it("rechaza con 404 si no existe", async () => {
    vi.spyOn(adminUserRepository, "buscarPorId").mockResolvedValue(null as never);

    await expect(adminUserService.reenviarAcceso(nuevo.id)).rejects.toMatchObject({ status: 404 });
  });
});

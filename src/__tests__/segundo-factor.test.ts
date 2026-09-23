import argon2 from "argon2";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authService } from "@/services/auth.service";
import { authRepository } from "@/repositories/auth.repository";
import { emailService } from "@/services/email.service";
import { hashearCodigo } from "@/lib/codigo-verificacion";

afterEach(() => {
  vi.restoreAllMocks();
});

const admin = {
  id: "770e8400-e29b-41d4-a716-446655440009",
  name: "Esau",
  email: "duenio@example.com",
  role: "SUPERADMIN" as const,
  isActive: true,
};

async function prepararLogin() {
  const passwordHash = await argon2.hash("correcta");
  vi.spyOn(authRepository, "findUserByEmail").mockResolvedValue({
    ...admin,
    password: passwordHash,
  } as never);
  vi.spyOn(authRepository, "createVerificationCode").mockResolvedValue({
    id: "880e8400-e29b-41d4-a716-446655440010",
  } as never);
}

describe("login de un administrador", () => {
  it("no entrega tokens: devuelve un desafío y manda el código", async () => {
    await prepararLogin();
    const enviar = vi.spyOn(emailService, "enviar").mockResolvedValue({ enviado: true });
    const guardar = vi.spyOn(authRepository, "storeRefreshToken");

    const resultado = await authService.login({ email: admin.email, password: "correcta" });

    expect(resultado).toEqual({
      requiereCodigo: true,
      desafioId: "880e8400-e29b-41d4-a716-446655440010",
      correoEnviado: true,
    });
    // Lo importante: sin sesión hasta que complete el código.
    expect(guardar).not.toHaveBeenCalled();
    expect(enviar).toHaveBeenCalledWith(expect.objectContaining({ para: admin.email }));
  });

  it("el código del correo nunca se guarda en claro", async () => {
    await prepararLogin();
    vi.spyOn(emailService, "enviar").mockResolvedValue({ enviado: true });
    const crear = vi.spyOn(authRepository, "createVerificationCode");

    await authService.login({ email: admin.email, password: "correcta" });

    const [, hashGuardado] = crear.mock.calls[0]!;
    expect(hashGuardado).toMatch(/^[a-f0-9]{64}$/);
  });

  it("avisa que el correo no salió, pero deja seguir", async () => {
    await prepararLogin();
    vi.spyOn(emailService, "enviar").mockResolvedValue({
      enviado: false,
      motivo: "Falta RESEND_API_KEY en el servidor",
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const resultado = await authService.login({ email: admin.email, password: "correcta" });

    expect(resultado).toMatchObject({ requiereCodigo: true, correoEnviado: false });
  });

  it("si el correo falla, deja el código en el log para no quedar encerrado", async () => {
    await prepararLogin();
    vi.spyOn(emailService, "enviar").mockResolvedValue({ enviado: false, motivo: "sin clave" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await authService.login({ email: admin.email, password: "correcta" });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining(admin.email));
    expect(warn.mock.calls[0]![0]).toMatch(/\d{6}/);
  });

  it("con el correo enviado, el código no aparece en ningún log", async () => {
    await prepararLogin();
    vi.spyOn(emailService, "enviar").mockResolvedValue({ enviado: true });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await authService.login({ email: admin.email, password: "correcta" });

    expect(warn).not.toHaveBeenCalled();
  });
});

describe("authService.verificarSegundoFactor", () => {
  const desafioValido = {
    id: "880e8400-e29b-41d4-a716-446655440010",
    codeHash: hashearCodigo("123456"),
    attempts: 0,
    usedAt: null,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    user: { ...admin },
  };

  it("entrega tokens con el código correcto y lo marca usado", async () => {
    vi.spyOn(authRepository, "findVerificationCode").mockResolvedValue(desafioValido as never);
    const marcar = vi.spyOn(authRepository, "markCodeUsed").mockResolvedValue({} as never);
    vi.spyOn(authRepository, "storeRefreshToken").mockResolvedValue({} as never);

    const resultado = await authService.verificarSegundoFactor({
      desafioId: desafioValido.id,
      codigo: "123456",
    });

    expect(resultado.user.id).toBe(admin.id);
    expect(resultado.accessToken).toEqual(expect.any(String));
    expect(marcar).toHaveBeenCalledWith(desafioValido.id);
  });

  it("suma un intento cuando el código está equivocado", async () => {
    vi.spyOn(authRepository, "findVerificationCode").mockResolvedValue(desafioValido as never);
    const sumar = vi.spyOn(authRepository, "registerFailedAttempt").mockResolvedValue({} as never);

    await expect(
      authService.verificarSegundoFactor({ desafioId: desafioValido.id, codigo: "000000" })
    ).rejects.toMatchObject({ status: 401 });

    expect(sumar).toHaveBeenCalledWith(desafioValido.id);
  });

  it("no suma intentos cuando el código ya venció", async () => {
    vi.spyOn(authRepository, "findVerificationCode").mockResolvedValue({
      ...desafioValido,
      expiresAt: new Date(Date.now() - 1000),
    } as never);
    const sumar = vi.spyOn(authRepository, "registerFailedAttempt");

    await expect(
      authService.verificarSegundoFactor({ desafioId: desafioValido.id, codigo: "123456" })
    ).rejects.toMatchObject({ status: 401 });

    expect(sumar).not.toHaveBeenCalled();
  });

  it("rechaza un desafío inexistente", async () => {
    vi.spyOn(authRepository, "findVerificationCode").mockResolvedValue(null as never);

    await expect(
      authService.verificarSegundoFactor({
        desafioId: "880e8400-e29b-41d4-a716-446655440011",
        codigo: "123456",
      })
    ).rejects.toMatchObject({ status: 401 });
  });

  it("no deja entrar si suspendieron la cuenta entre el código y el canje", async () => {
    vi.spyOn(authRepository, "findVerificationCode").mockResolvedValue({
      ...desafioValido,
      user: { ...admin, isActive: false },
    } as never);
    vi.spyOn(authRepository, "markCodeUsed").mockResolvedValue({} as never);

    await expect(
      authService.verificarSegundoFactor({ desafioId: desafioValido.id, codigo: "123456" })
    ).rejects.toMatchObject({ status: 403 });
  });
});

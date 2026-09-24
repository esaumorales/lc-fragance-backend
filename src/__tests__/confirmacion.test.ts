import { afterEach, describe, expect, it, vi } from "vitest";
import { confirmacionService } from "@/services/confirmacion.service";
import { authRepository } from "@/repositories/auth.repository";
import { emailService } from "@/services/email.service";
import { hashearCodigo } from "@/lib/codigo-verificacion";

afterEach(() => {
  vi.restoreAllMocks();
});

const duenio = {
  id: "dd0e8400-e29b-41d4-a716-446655440060",
  name: "Esau",
  email: "duenio@example.com",
  role: "SUPERADMIN" as const,
  isActive: true,
};

const confirmacionId = "ee0e8400-e29b-41d4-a716-446655440061";

function desafio(extra: Record<string, unknown> = {}) {
  return {
    id: confirmacionId,
    userId: duenio.id,
    purpose: "ACTION",
    codeHash: hashearCodigo("123456"),
    attempts: 0,
    usedAt: null,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    ...extra,
  };
}

describe("confirmacionService.pedir", () => {
  it("crea el código con propósito ACTION y lo manda al correo", async () => {
    vi.spyOn(authRepository, "findUserById").mockResolvedValue(duenio as never);
    const crear = vi
      .spyOn(authRepository, "createVerificationCode")
      .mockResolvedValue({ id: confirmacionId } as never);
    const enviar = vi.spyOn(emailService, "enviar").mockResolvedValue({ enviado: true });

    const resultado = await confirmacionService.pedir(duenio.id);

    expect(resultado).toEqual({ confirmacionId, correoEnviado: true });
    expect(crear.mock.calls[0]![3]).toBe("ACTION");
    expect(enviar).toHaveBeenCalledWith(expect.objectContaining({ para: duenio.email }));
  });

  it("el código no se guarda en claro", async () => {
    vi.spyOn(authRepository, "findUserById").mockResolvedValue(duenio as never);
    const crear = vi
      .spyOn(authRepository, "createVerificationCode")
      .mockResolvedValue({ id: confirmacionId } as never);
    vi.spyOn(emailService, "enviar").mockResolvedValue({ enviado: true });

    await confirmacionService.pedir(duenio.id);

    expect(crear.mock.calls[0]![1]).toMatch(/^[a-f0-9]{64}$/);
  });

  // Sin esta salida, con el correo caído no habría forma de confirmar nada.
  it("si el correo no sale, deja el código en el log", async () => {
    vi.spyOn(authRepository, "findUserById").mockResolvedValue(duenio as never);
    vi.spyOn(authRepository, "createVerificationCode").mockResolvedValue({
      id: confirmacionId,
    } as never);
    vi.spyOn(emailService, "enviar").mockResolvedValue({ enviado: false, motivo: "sin dominio" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const resultado = await confirmacionService.pedir(duenio.id);

    expect(resultado.correoEnviado).toBe(false);
    expect(warn.mock.calls[0]![0]).toMatch(/\d{6}/);
  });
});

describe("confirmacionService.validar", () => {
  it("acepta el código correcto y lo quema", async () => {
    vi.spyOn(authRepository, "findVerificationCode").mockResolvedValue(desafio() as never);
    const quemar = vi.spyOn(authRepository, "markCodeUsed").mockResolvedValue({} as never);

    await confirmacionService.validar(duenio.id, confirmacionId, "123456");

    expect(quemar).toHaveBeenCalledWith(confirmacionId);
  });

  // Lo importante: un código de ingreso no autoriza acciones, ni al revés.
  it("rechaza un código pedido para iniciar sesión", async () => {
    vi.spyOn(authRepository, "findVerificationCode").mockResolvedValue(
      desafio({ purpose: "LOGIN" }) as never
    );

    await expect(
      confirmacionService.validar(duenio.id, confirmacionId, "123456")
    ).rejects.toMatchObject({ status: 422 });
  });

  // Ni siquiera con el código correcto de otra persona.
  it("rechaza un código que es de otra cuenta", async () => {
    vi.spyOn(authRepository, "findVerificationCode").mockResolvedValue(
      desafio({ userId: "otro-usuario" }) as never
    );

    await expect(
      confirmacionService.validar(duenio.id, confirmacionId, "123456")
    ).rejects.toMatchObject({ status: 422 });
  });

  it("rechaza el código equivocado y suma el intento", async () => {
    vi.spyOn(authRepository, "findVerificationCode").mockResolvedValue(desafio() as never);
    const sumar = vi.spyOn(authRepository, "registerFailedAttempt").mockResolvedValue({} as never);

    await expect(
      confirmacionService.validar(duenio.id, confirmacionId, "000000")
    ).rejects.toMatchObject({ status: 422 });
    expect(sumar).toHaveBeenCalledOnce();
  });

  it("no acepta el mismo código dos veces", async () => {
    vi.spyOn(authRepository, "findVerificationCode").mockResolvedValue(
      desafio({ usedAt: new Date() }) as never
    );

    await expect(
      confirmacionService.validar(duenio.id, confirmacionId, "123456")
    ).rejects.toMatchObject({ status: 422 });
  });

  it("rechaza uno vencido", async () => {
    vi.spyOn(authRepository, "findVerificationCode").mockResolvedValue(
      desafio({ expiresAt: new Date(Date.now() - 1000) }) as never
    );

    await expect(
      confirmacionService.validar(duenio.id, confirmacionId, "123456")
    ).rejects.toMatchObject({ status: 422 });
  });

  it("rechaza una confirmación inexistente", async () => {
    vi.spyOn(authRepository, "findVerificationCode").mockResolvedValue(null as never);

    await expect(
      confirmacionService.validar(duenio.id, confirmacionId, "123456")
    ).rejects.toMatchObject({ status: 422 });
  });
});

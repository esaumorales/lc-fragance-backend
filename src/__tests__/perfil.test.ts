import argon2 from "argon2";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authService } from "@/services/auth.service";
import { authRepository } from "@/repositories/auth.repository";

afterEach(() => {
  vi.restoreAllMocks();
});

const usuario = {
  id: "aa0e8400-e29b-41d4-a716-446655440030",
  name: "Cliente",
  email: "cliente@example.com",
  role: "CUSTOMER" as const,
  isActive: true,
};

async function conClave(clave: string) {
  const hash = await argon2.hash(clave);
  vi.spyOn(authRepository, "findUserById").mockResolvedValue({
    ...usuario,
    password: hash,
  } as never);
}

describe("authService.actualizarPerfil", () => {
  it("cambia el nombre sin pedir la contraseña", async () => {
    await conClave("laClaveDeSiempre");
    const guardar = vi
      .spyOn(authRepository, "updateProfile")
      .mockResolvedValue({ ...usuario, name: "Cliente Nuevo" } as never);

    const resultado = await authService.actualizarPerfil(usuario.id, { name: "Cliente Nuevo" });

    expect(resultado.name).toBe("Cliente Nuevo");
    expect(guardar).toHaveBeenCalledWith(usuario.id, { name: "Cliente Nuevo" });
  });

  // Con una sesión robada, cambiar el correo bastaría para quedarse la cuenta.
  it("no cambia el correo sin confirmar la contraseña", async () => {
    await conClave("laClaveDeSiempre");

    await expect(
      authService.actualizarPerfil(usuario.id, { email: "otro@example.com" })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rechaza si la contraseña de confirmación no coincide", async () => {
    await conClave("laClaveDeSiempre");

    await expect(
      authService.actualizarPerfil(usuario.id, {
        email: "otro@example.com",
        password: "incorrecta",
      })
    ).rejects.toMatchObject({ status: 401 });
  });

  it("rechaza con 409 si ese correo ya tiene dueño", async () => {
    await conClave("laClaveDeSiempre");
    vi.spyOn(authRepository, "findUserByEmail").mockResolvedValue({ id: "otro-id" } as never);

    await expect(
      authService.actualizarPerfil(usuario.id, {
        email: "ocupado@example.com",
        password: "laClaveDeSiempre",
      })
    ).rejects.toMatchObject({ status: 409 });
  });

  it("cambia el correo con la contraseña correcta", async () => {
    await conClave("laClaveDeSiempre");
    vi.spyOn(authRepository, "findUserByEmail").mockResolvedValue(null);
    const guardar = vi
      .spyOn(authRepository, "updateProfile")
      .mockResolvedValue({ ...usuario, email: "nuevo@example.com" } as never);

    const resultado = await authService.actualizarPerfil(usuario.id, {
      email: "nuevo@example.com",
      password: "laClaveDeSiempre",
    });

    expect(resultado.email).toBe("nuevo@example.com");
    expect(guardar).toHaveBeenCalledWith(usuario.id, { email: "nuevo@example.com" });
  });

  // Reenviar el mismo correo no es un cambio: no puede chocar consigo mismo.
  it("mandar el correo que ya tiene no exige contraseña", async () => {
    await conClave("laClaveDeSiempre");
    vi.spyOn(authRepository, "updateProfile").mockResolvedValue(usuario as never);

    await expect(
      authService.actualizarPerfil(usuario.id, { name: "Otro", email: usuario.email })
    ).resolves.toMatchObject({ email: usuario.email });
  });
});

describe("authService.cambiarContrasena", () => {
  it("rechaza si la contraseña actual no coincide", async () => {
    await conClave("laClaveDeSiempre");

    await expect(
      authService.cambiarContrasena(usuario.id, { actual: "incorrecta", nueva: "unaClaveNueva1" })
    ).rejects.toMatchObject({ status: 401 });
  });

  it("guarda la nueva hasheada, cierra las demás sesiones y deja entrada", async () => {
    await conClave("laClaveDeSiempre");
    const guardar = vi.spyOn(authRepository, "updatePassword").mockResolvedValue({} as never);
    const cerrar = vi.spyOn(authRepository, "revokeAllRefreshTokens").mockResolvedValue({} as never);
    vi.spyOn(authRepository, "storeRefreshToken").mockResolvedValue({} as never);

    const resultado = await authService.cambiarContrasena(usuario.id, {
      actual: "laClaveDeSiempre",
      nueva: "unaClaveNueva1",
    });

    const [, hashGuardado] = guardar.mock.calls[0]!;
    expect(hashGuardado).toMatch(/^\$argon2/);
    expect(hashGuardado).not.toContain("unaClaveNueva1");
    expect(cerrar).toHaveBeenCalledWith(usuario.id);
    // Quien cambia la clave no puede quedar afuera por su propio cambio.
    expect(resultado.accessToken).toEqual(expect.any(String));
  });
});

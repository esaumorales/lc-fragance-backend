import { describe, expect, it, vi, afterEach } from "vitest";
import { authService } from "@/services/auth.service";
import { authRepository } from "@/repositories/auth.repository";
import argon2 from "argon2";

afterEach(() => {
  vi.restoreAllMocks();
});

const baseUser = {
  id: "660e8400-e29b-41d4-a716-446655440001",
  name: "Ana",
  email: "ana@example.com",
  role: "CUSTOMER" as const,
  isActive: true,
};

describe("authService.register", () => {
  it("rechaza con 409 si el correo ya existe", async () => {
    vi.spyOn(authRepository, "findUserByEmail").mockResolvedValue({ ...baseUser, password: "x" } as never);

    await expect(
      authService.register({ name: "Ana", email: "ana@example.com", password: "supersecreta" })
    ).rejects.toMatchObject({ status: 409 });
  });

  it("crea el usuario con la contraseña hasheada y devuelve tokens", async () => {
    vi.spyOn(authRepository, "findUserByEmail").mockResolvedValue(null);
    const createSpy = vi
      .spyOn(authRepository, "createUser")
      // El cast va sobre la implementacion entera, no sobre el objeto: si no,
      // la funcion queda tipada como Promise<never> y deja de encajar con el
      // cliente fluido que devuelve Prisma.
      .mockImplementation((async (data: { password: string }) => ({
        ...baseUser,
        password: data.password,
      })) as never);
    vi.spyOn(authRepository, "storeRefreshToken").mockResolvedValue({} as never);

    const result = await authService.register({
      name: "Ana",
      email: "ana@example.com",
      password: "supersecreta",
    });

    expect(result.user.email).toBe("ana@example.com");
    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));

    const storedPassword = createSpy.mock.calls[0][0].password;
    expect(storedPassword).not.toBe("supersecreta");
    expect(await argon2.verify(storedPassword, "supersecreta")).toBe(true);
  });
});

describe("authService.login", () => {
  it("rechaza con 401 si el usuario no existe", async () => {
    vi.spyOn(authRepository, "findUserByEmail").mockResolvedValue(null);

    await expect(
      authService.login({ email: "no-existe@example.com", password: "x" })
    ).rejects.toMatchObject({ status: 401 });
  });

  it("rechaza con 401 si la contraseña no coincide", async () => {
    const passwordHash = await argon2.hash("correcta");
    vi.spyOn(authRepository, "findUserByEmail").mockResolvedValue({
      ...baseUser,
      password: passwordHash,
    } as never);

    await expect(
      authService.login({ email: baseUser.email, password: "incorrecta" })
    ).rejects.toMatchObject({ status: 401 });
  });

  it("devuelve tokens cuando la contraseña es correcta", async () => {
    const passwordHash = await argon2.hash("correcta");
    vi.spyOn(authRepository, "findUserByEmail").mockResolvedValue({
      ...baseUser,
      password: passwordHash,
    } as never);
    vi.spyOn(authRepository, "storeRefreshToken").mockResolvedValue({} as never);

    const result = await authService.login({ email: baseUser.email, password: "correcta" });

    // Un cliente entra derecho: el segundo factor es solo para el panel.
    if ("requiereCodigo" in result) {
      throw new Error("un CUSTOMER no deberia pasar por el segundo factor");
    }
    expect(result.user.id).toBe(baseUser.id);
    expect(result.accessToken).toEqual(expect.any(String));
  });

  it("rechaza con 403 si la cuenta está suspendida", async () => {
    const passwordHash = await argon2.hash("correcta");
    vi.spyOn(authRepository, "findUserByEmail").mockResolvedValue({
      ...baseUser,
      isActive: false,
      password: passwordHash,
    } as never);

    await expect(
      authService.login({ email: baseUser.email, password: "correcta" })
    ).rejects.toMatchObject({ status: 403 });
  });
});

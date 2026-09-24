import { afterEach, describe, expect, it, vi } from "vitest";
import { authService } from "@/services/auth.service";
import { authRepository } from "@/repositories/auth.repository";
import { direccionSchema } from "@/schemas/auth.schema";

afterEach(() => {
  vi.restoreAllMocks();
});

const userId = "bb0e8400-e29b-41d4-a716-446655440040";

const completa = {
  recipient: "Esau Morales",
  phone: "999888777",
  street: "Av. Siempre Viva 742",
  reference: "Portón negro, frente al parque",
  district: "Miraflores",
  city: "Lima",
  region: "Lima",
  postalCode: "15074",
};

describe("direccionSchema", () => {
  it("exige calle, distrito y ciudad", () => {
    const resultado = direccionSchema.safeParse({ street: "", district: "", city: "" });
    expect(resultado.success).toBe(false);
  });

  it("acepta una dirección mínima, sin los opcionales", () => {
    const resultado = direccionSchema.safeParse({
      street: "Jr. Union 123",
      district: "Cercado",
      city: "Lima",
    });
    expect(resultado.success).toBe(true);
  });

  it("recorta los espacios de los costados", () => {
    const resultado = direccionSchema.parse({
      street: "  Jr. Union 123  ",
      district: " Cercado ",
      city: " Lima ",
    });
    expect(resultado.street).toBe("Jr. Union 123");
    expect(resultado.district).toBe("Cercado");
  });
});

describe("authService.guardarDireccion", () => {
  it("guarda todos los campos", async () => {
    const guardar = vi.spyOn(authRepository, "upsertAddress").mockResolvedValue({} as never);

    await authService.guardarDireccion(userId, completa);

    expect(guardar).toHaveBeenCalledWith(userId, expect.objectContaining({
      userId,
      street: completa.street,
      district: completa.district,
      city: completa.city,
      phone: completa.phone,
      reference: completa.reference,
    }));
  });

  // Con undefined, Prisma ignora el campo y no habria forma de borrar un dato
  // que ya estaba cargado.
  it("los opcionales vacíos se guardan como null, no se ignoran", async () => {
    const guardar = vi.spyOn(authRepository, "upsertAddress").mockResolvedValue({} as never);

    await authService.guardarDireccion(userId, {
      street: "Jr. Union 123",
      district: "Cercado",
      city: "Lima",
    });

    const [, datos] = guardar.mock.calls[0]!;
    expect(datos.phone).toBeNull();
    expect(datos.reference).toBeNull();
    expect(datos.recipient).toBeNull();
    expect(datos.postalCode).toBeNull();
  });
});

describe("authService.obtenerDireccion", () => {
  it("devuelve null cuando la cuenta todavía no cargó ninguna", async () => {
    vi.spyOn(authRepository, "findAddress").mockResolvedValue(null);
    await expect(authService.obtenerDireccion(userId)).resolves.toBeNull();
  });
});

describe("authService.eliminarDireccion", () => {
  it("borra la dirección de esa cuenta y de ninguna otra", async () => {
    const borrar = vi.spyOn(authRepository, "deleteAddress").mockResolvedValue({} as never);

    await authService.eliminarDireccion(userId);

    expect(borrar).toHaveBeenCalledWith(userId);
  });
});

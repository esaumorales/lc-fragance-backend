import { describe, expect, it } from "vitest";
import { resolverAdminInicial } from "@/lib/admin-inicial";

describe("resolverAdminInicial", () => {
  it("usa la clave del entorno y la marca como no de desarrollo", () => {
    const admin = resolverAdminInicial({
      ADMIN_EMAIL: "dueño@tienda.com",
      ADMIN_PASSWORD: "ClaveLargaDeProduccion",
    } as NodeJS.ProcessEnv);

    expect(admin).toEqual({
      email: "dueño@tienda.com",
      password: "ClaveLargaDeProduccion",
      esDeDesarrollo: false,
    });
  });

  it("cae en la clave de desarrollo cuando no hay nada configurado", () => {
    const admin = resolverAdminInicial({} as NodeJS.ProcessEnv);

    expect(admin.email).toBe("admin@lcfragance.com");
    expect(admin.esDeDesarrollo).toBe(true);
    expect(admin.password.length).toBeGreaterThan(0);
  });

  it("trata los espacios en blanco como clave ausente", () => {
    const admin = resolverAdminInicial({ ADMIN_PASSWORD: "   " } as NodeJS.ProcessEnv);

    expect(admin.esDeDesarrollo).toBe(true);
  });

  it("corta el seed en producción si falta ADMIN_PASSWORD", () => {
    expect(() =>
      resolverAdminInicial({ NODE_ENV: "production" } as NodeJS.ProcessEnv)
    ).toThrow(/ADMIN_PASSWORD/);
  });

  it("en producción no acepta una clave de solo espacios", () => {
    expect(() =>
      resolverAdminInicial({ NODE_ENV: "production", ADMIN_PASSWORD: "  " } as NodeJS.ProcessEnv)
    ).toThrow(/ADMIN_PASSWORD/);
  });

  it("recorta los espacios alrededor del email", () => {
    const admin = resolverAdminInicial({
      ADMIN_EMAIL: "  admin@tienda.com  ",
      ADMIN_PASSWORD: "x",
    } as NodeJS.ProcessEnv);

    expect(admin.email).toBe("admin@tienda.com");
  });
});

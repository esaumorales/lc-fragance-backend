import { describe, expect, it, vi, afterEach } from "vitest";
import { filtroDeRoles, puedeVerRol, rolesVisiblesPara } from "@/lib/visibilidad-usuarios";
import { adminUserService } from "@/services/admin-user.service";
import { adminUserRepository } from "@/repositories/admin-user.repository";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("rolesVisiblesPara", () => {
  it("el dueño ve todo", () => {
    expect(rolesVisiblesPara("SUPERADMIN").sort()).toEqual(["ADMIN", "CUSTOMER", "SUPERADMIN"]);
  });

  // Un administrador administra el catálogo: los datos de quien compra no le
  // hacen falta, y quien manda no se expone a quien no manda.
  it("un administrador solo ve a sus pares", () => {
    expect(rolesVisiblesPara("ADMIN")).toEqual(["ADMIN"]);
  });

  it("un administrador no ve clientes ni superadministradores", () => {
    expect(puedeVerRol("ADMIN", "CUSTOMER")).toBe(false);
    expect(puedeVerRol("ADMIN", "SUPERADMIN")).toBe(false);
    expect(puedeVerRol("ADMIN", "ADMIN")).toBe(true);
  });
});

describe("filtroDeRoles", () => {
  it("sin pedido, devuelve todo lo que ese rol alcanza", () => {
    expect(filtroDeRoles("ADMIN")).toEqual(["ADMIN"]);
    expect(filtroDeRoles("SUPERADMIN").sort()).toEqual(["ADMIN", "CUSTOMER", "SUPERADMIN"]);
  });

  it("respeta el rol pedido cuando está permitido", () => {
    expect(filtroDeRoles("SUPERADMIN", "CUSTOMER")).toEqual(["CUSTOMER"]);
    expect(filtroDeRoles("ADMIN", "ADMIN")).toEqual(["ADMIN"]);
  });

  // Pedir ?rol=CUSTOMER a mano no puede servir para ver más de lo que toca.
  it("no deja que un administrador amplíe lo que ve por la query", () => {
    expect(filtroDeRoles("ADMIN", "CUSTOMER")).toEqual([]);
    expect(filtroDeRoles("ADMIN", "SUPERADMIN")).toEqual([]);
  });
});

describe("adminUserService.listar", () => {
  function espiar() {
    const listar = vi.spyOn(adminUserRepository, "listar").mockResolvedValue([] as never);
    const contar = vi
      .spyOn(adminUserRepository, "contarPorRol")
      .mockResolvedValue({ total: 0, porRol: {} } as never);
    return { listar, contar };
  }

  it("a un administrador solo le trae administradores", async () => {
    const { listar } = espiar();

    await adminUserService.listar("ADMIN");

    expect(listar).toHaveBeenCalledWith(["ADMIN"]);
  });

  it("al dueño le trae los tres roles", async () => {
    const { listar } = espiar();

    await adminUserService.listar("SUPERADMIN");

    expect(listar.mock.calls[0]![0]!.sort()).toEqual(["ADMIN", "CUSTOMER", "SUPERADMIN"]);
  });

  // El recorte tiene que pasar en el servidor: esconder filas en la pantalla
  // deja la respuesta completa viajando igual y cualquiera la lee.
  it("ignora el rol pedido si el administrador no puede verlo", async () => {
    const { listar } = espiar();

    await adminUserService.listar("ADMIN", "CUSTOMER");

    expect(listar).toHaveBeenCalledWith([]);
  });

  // El total también es información: cuántos clientes hay no es asunto de un
  // administrador.
  it("cuenta solo sobre los roles que ese rol alcanza", async () => {
    const { contar } = espiar();

    await adminUserService.listar("ADMIN", "ADMIN");

    expect(contar).toHaveBeenCalledWith(["ADMIN"]);
  });
});

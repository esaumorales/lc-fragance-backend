import { describe, expect, it } from "vitest";
import { puedeActualizar, puedeEliminar } from "@/lib/reglas-admin";
import { tieneAcceso } from "@/middlewares/auth";

const DUENIO = "11111111-1111-1111-1111-111111111111";
const OTRO = "22222222-2222-2222-2222-222222222222";

const superadmin = { id: OTRO, role: "SUPERADMIN" as const, isActive: true };
const admin = { id: OTRO, role: "ADMIN" as const, isActive: true };

describe("puedeActualizar", () => {
  it("deja suspender a otro administrador", () => {
    expect(puedeActualizar(DUENIO, admin, { isActive: false }, 1)).toEqual({ permitido: true });
  });

  it("no deja suspenderse a uno mismo", () => {
    const yo = { id: DUENIO, role: "SUPERADMIN" as const, isActive: true };
    expect(puedeActualizar(DUENIO, yo, { isActive: false }, 2)).toEqual({
      permitido: false,
      motivo: "No podés suspender tu propia cuenta",
    });
  });

  it("no deja quitarse a uno mismo el rol de superadministrador", () => {
    const yo = { id: DUENIO, role: "SUPERADMIN" as const, isActive: true };
    expect(puedeActualizar(DUENIO, yo, { role: "ADMIN" }, 5).permitido).toBe(false);
  });

  it("no deja degradar al último superadministrador activo", () => {
    expect(puedeActualizar(DUENIO, superadmin, { role: "ADMIN" }, 1)).toEqual({
      permitido: false,
      motivo: "Es el único superadministrador activo que queda",
    });
  });

  it("deja degradarlo si queda otro", () => {
    expect(puedeActualizar(DUENIO, superadmin, { role: "ADMIN" }, 2)).toEqual({ permitido: true });
  });

  it("no deja suspender al último superadministrador activo", () => {
    expect(puedeActualizar(DUENIO, superadmin, { isActive: false }, 1).permitido).toBe(false);
  });

  it("renombrar nunca pone en riesgo el mando", () => {
    expect(puedeActualizar(DUENIO, superadmin, {}, 1)).toEqual({ permitido: true });
  });

  it("reactivar a un superadministrador suspendido siempre vale", () => {
    const suspendido = { id: OTRO, role: "SUPERADMIN" as const, isActive: false };
    expect(puedeActualizar(DUENIO, suspendido, { isActive: true }, 1)).toEqual({ permitido: true });
  });
});

describe("puedeEliminar", () => {
  it("deja eliminar a otro administrador", () => {
    expect(puedeEliminar(DUENIO, admin, 1)).toEqual({ permitido: true });
  });

  it("no deja eliminarse a uno mismo", () => {
    const yo = { id: DUENIO, role: "SUPERADMIN" as const, isActive: true };
    expect(puedeEliminar(DUENIO, yo, 2)).toEqual({
      permitido: false,
      motivo: "No podés eliminar tu propia cuenta",
    });
  });

  it("no deja eliminar al último superadministrador activo", () => {
    expect(puedeEliminar(DUENIO, superadmin, 1).permitido).toBe(false);
  });
});

describe("tieneAcceso", () => {
  it("el superadministrador pasa donde se pide ADMIN", () => {
    expect(tieneAcceso("SUPERADMIN", ["ADMIN"])).toBe(true);
  });

  it("un admin no pasa donde se pide SUPERADMIN", () => {
    expect(tieneAcceso("ADMIN", ["SUPERADMIN"])).toBe(false);
  });

  it("un cliente no pasa por ningún lado del panel", () => {
    expect(tieneAcceso("CUSTOMER", ["ADMIN"])).toBe(false);
    expect(tieneAcceso("CUSTOMER", ["SUPERADMIN"])).toBe(false);
  });
});

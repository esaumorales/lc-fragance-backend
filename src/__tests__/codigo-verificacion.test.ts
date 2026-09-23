import { describe, expect, it } from "vitest";
import {
  INTENTOS_MAXIMOS,
  LARGO_DEL_CODIGO,
  codigoCoincide,
  generarCodigo,
  hashearCodigo,
  vencimientoDelCodigo,
  verificarCodigo,
} from "@/lib/codigo-verificacion";

describe("generarCodigo", () => {
  it("devuelve siempre seis digitos, incluso cuando el numero es chico", () => {
    for (let i = 0; i < 200; i += 1) {
      const codigo = generarCodigo();
      expect(codigo).toMatch(/^\d{6}$/);
      expect(codigo).toHaveLength(LARGO_DEL_CODIGO);
    }
  });

  it("no repite el mismo codigo una y otra vez", () => {
    const vistos = new Set(Array.from({ length: 50 }, () => generarCodigo()));
    expect(vistos.size).toBeGreaterThan(40);
  });
});

describe("codigoCoincide", () => {
  it("acepta el codigo correcto", () => {
    expect(codigoCoincide("123456", hashearCodigo("123456"))).toBe(true);
  });

  it("ignora los espacios de los costados, que el correo suele agregar", () => {
    expect(codigoCoincide(" 123456 ", hashearCodigo("123456"))).toBe(true);
  });

  it("rechaza otro codigo", () => {
    expect(codigoCoincide("654321", hashearCodigo("123456"))).toBe(false);
  });

  it("no revienta si el hash guardado esta corrupto", () => {
    expect(codigoCoincide("123456", "no-es-un-hash")).toBe(false);
  });
});

describe("verificarCodigo", () => {
  const ahora = new Date("2026-01-01T12:00:00Z");
  const base = {
    codeHash: hashearCodigo("123456"),
    attempts: 0,
    usedAt: null as Date | null,
    expiresAt: new Date("2026-01-01T12:05:00Z"),
  };

  it("acepta el codigo correcto dentro del plazo", () => {
    expect(verificarCodigo(base, "123456", ahora)).toEqual({ valido: true });
  });

  it("rechaza uno ya usado", () => {
    const usado = { ...base, usedAt: new Date("2026-01-01T11:59:00Z") };
    expect(verificarCodigo(usado, "123456", ahora)).toEqual({ valido: false, motivo: "usado" });
  });

  it("rechaza uno vencido", () => {
    const vencido = { ...base, expiresAt: new Date("2026-01-01T11:59:00Z") };
    expect(verificarCodigo(vencido, "123456", ahora)).toEqual({ valido: false, motivo: "vencido" });
  });

  it("corta cuando se agotaron los intentos, aunque el codigo sea el correcto", () => {
    const agotado = { ...base, attempts: INTENTOS_MAXIMOS };
    expect(verificarCodigo(agotado, "123456", ahora)).toEqual({
      valido: false,
      motivo: "sin-intentos",
    });
  });

  it("rechaza el codigo equivocado", () => {
    expect(verificarCodigo(base, "000000", ahora)).toEqual({ valido: false, motivo: "incorrecto" });
  });
});

describe("vencimientoDelCodigo", () => {
  it("cae diez minutos despues", () => {
    const desde = new Date("2026-01-01T12:00:00Z");
    expect(vencimientoDelCodigo(desde).toISOString()).toBe("2026-01-01T12:10:00.000Z");
  });
});

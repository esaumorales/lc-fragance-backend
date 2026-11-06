import { describe, expect, it } from "vitest";
import { normalizarTelefono } from "@/lib/telefono";

describe("normalizarTelefono", () => {
  // Se escribe a mano en el panel: va a venir con el formato que a cada uno
  // le salga, y wa.me solo acepta dígitos.
  it("saca espacios, guiones, paréntesis y el signo más", () => {
    expect(normalizarTelefono("+51 974 732 528")).toBe("51974732528");
    expect(normalizarTelefono("(051) 974-732-528")).toBe("051974732528");
  });

  it("deja pasar uno que ya viene limpio", () => {
    expect(normalizarTelefono("51974732528")).toBe("51974732528");
  });

  it("descarta lo que es muy corto para ser un teléfono", () => {
    expect(normalizarTelefono("123")).toBeNull();
    expect(normalizarTelefono("sin numero")).toBeNull();
  });

  it("aguanta vacío, nulo e indefinido", () => {
    expect(normalizarTelefono("")).toBeNull();
    expect(normalizarTelefono(null)).toBeNull();
    expect(normalizarTelefono(undefined)).toBeNull();
  });
});

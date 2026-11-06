import { describe, expect, it } from "vitest";
import { motivoDelTelefono, normalizarTelefono, soloDigitos } from "@/lib/telefono";
import { guardarConfiguracionPagoSchema } from "@/schemas/configuracion-pago.schema";

describe("limpiar el formato", () => {
  // Se escribe a mano en el panel: viene con el formato que a cada uno le
  // salga, y wa.me solo acepta dígitos.
  it("saca espacios, guiones, paréntesis y el signo más", () => {
    expect(soloDigitos("+51 974 732 528")).toBe("51974732528");
    expect(soloDigitos("(+51) 974-732-528")).toBe("51974732528");
  });
});

describe("el número para el enlace", () => {
  it("acepta uno internacional", () => {
    expect(normalizarTelefono("+51 974 732 528")).toBe("51974732528");
  });

  // El error fácil: escribir el número local y olvidar el 51. El enlace se
  // arma igual pero abre un chat con nadie.
  it("rechaza un móvil peruano sin código de país", () => {
    expect(normalizarTelefono("974732528")).toBeNull();
    expect(normalizarTelefono("918955833")).toBeNull();
  });

  it("aguanta vacío, nulo e indefinido", () => {
    expect(normalizarTelefono("")).toBeNull();
    expect(normalizarTelefono(null)).toBeNull();
    expect(normalizarTelefono(undefined)).toBeNull();
  });
});

describe("el motivo, para poder decirlo", () => {
  it("explica que falta el código del país", () => {
    expect(motivoDelTelefono("974732528")).toMatch(/código del país/);
  });

  it("no se queja de uno correcto", () => {
    expect(motivoDelTelefono("+51 974 732 528")).toBeNull();
  });

  // Vacío no es un error: el campo es opcional, solo que sin él no hay botón.
  it("el campo vacío no es un error", () => {
    expect(motivoDelTelefono("")).toBeNull();
    expect(motivoDelTelefono(null)).toBeNull();
  });

  it("avisa si tiene demasiados dígitos", () => {
    expect(motivoDelTelefono("1234567890123456789")).toMatch(/demasiados/);
  });
});

describe("guardar la configuración", () => {
  // Se valida en el servidor y no solo en la pantalla: la pantalla se puede
  // saltear mandando la petición a mano.
  it("rechaza un WhatsApp sin código de país", () => {
    const resultado = guardarConfiguracionPagoSchema.safeParse({ whatsapp: "974732528" });

    expect(resultado.success).toBe(false);
  });

  it("acepta uno con código de país", () => {
    expect(guardarConfiguracionPagoSchema.safeParse({ whatsapp: "+51 974 732 528" }).success).toBe(
      true
    );
  });

  it("acepta dejarlo vacío", () => {
    expect(guardarConfiguracionPagoSchema.safeParse({ whatsapp: "" }).success).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { normalizarTelefono, telefonoDeContacto } from "@/lib/telefono-de-contacto";

const VIEJO = new Date("2026-01-01T00:00:00Z");
const NUEVO = new Date("2026-06-01T00:00:00Z");

describe("normalizarTelefono", () => {
  // wa.me no acepta nada que no sea un dígito.
  it("saca espacios, guiones y paréntesis", () => {
    expect(normalizarTelefono("+51 (999) 123-456")).toBe("51999123456");
  });

  it("descarta lo que es muy corto para ser un teléfono", () => {
    expect(normalizarTelefono("123")).toBeNull();
    expect(normalizarTelefono("sin numero")).toBeNull();
  });

  it("aguanta vacío y nulo", () => {
    expect(normalizarTelefono("")).toBeNull();
    expect(normalizarTelefono(null)).toBeNull();
  });
});

describe("telefonoDeContacto", () => {
  it("usa el teléfono del perfil de quien atiende", () => {
    const numero = telefonoDeContacto([
      { role: "ADMIN", createdAt: VIEJO, telefono: "51999111222" },
    ]);

    expect(numero).toBe("51999111222");
  });

  // Tiene que dar lo mismo en cada pedido, no uno al azar.
  it("manda el dueño antes que un administrador", () => {
    const numero = telefonoDeContacto([
      { role: "ADMIN", createdAt: VIEJO, telefono: "51999111222" },
      { role: "SUPERADMIN", createdAt: NUEVO, telefono: "51988333444" },
    ]);

    expect(numero).toBe("51988333444");
  });

  it("entre pares, el de la cuenta más vieja", () => {
    const numero = telefonoDeContacto([
      { role: "ADMIN", createdAt: NUEVO, telefono: "51900000002" },
      { role: "ADMIN", createdAt: VIEJO, telefono: "51900000001" },
    ]);

    expect(numero).toBe("51900000001");
  });

  it("salta a quien sí cargó número", () => {
    const numero = telefonoDeContacto([
      { role: "SUPERADMIN", createdAt: VIEJO, telefono: null },
      { role: "ADMIN", createdAt: NUEVO, telefono: "51999111222" },
    ]);

    expect(numero).toBe("51999111222");
  });

  // Dos personas pueden tener el mismo número: no es un identificador.
  it("no le molesta que el número se repita", () => {
    const numero = telefonoDeContacto([
      { role: "SUPERADMIN", createdAt: VIEJO, telefono: "51999111222" },
      { role: "ADMIN", createdAt: NUEVO, telefono: "51999111222" },
    ]);

    expect(numero).toBe("51999111222");
  });

  it("nunca usa el teléfono de un cliente", () => {
    const numero = telefonoDeContacto([
      { role: "CUSTOMER", createdAt: VIEJO, telefono: "51977777777" },
    ]);

    expect(numero).toBeNull();
  });

  // El botón de WhatsApp no puede desaparecer porque nadie completó su perfil.
  it("cae al número de configuración si ningún perfil lo tiene", () => {
    const numero = telefonoDeContacto(
      [{ role: "ADMIN", createdAt: VIEJO, telefono: null }],
      "51999999999"
    );

    expect(numero).toBe("51999999999");
  });

  it("sin nadie y sin respaldo, no hay número", () => {
    expect(telefonoDeContacto([], null)).toBeNull();
  });
});

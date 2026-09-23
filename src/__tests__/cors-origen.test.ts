import { describe, expect, it } from "vitest";
import { comprobadorDeOrigen, esOrigenPermitido, parsearOrigenes } from "@/lib/cors-origen";

describe("parsearOrigenes", () => {
  it("separa por coma y limpia espacios y barras finales", () => {
    expect(parsearOrigenes(" https://tienda.app/ , http://localhost:3000 ")).toEqual([
      "https://tienda.app",
      "http://localhost:3000",
    ]);
  });

  it("descarta las entradas vacias de una lista mal escrita", () => {
    expect(parsearOrigenes("https://tienda.app,,")).toEqual(["https://tienda.app"]);
  });
});

describe("esOrigenPermitido", () => {
  const permitidos = parsearOrigenes("https://tienda.app,http://localhost:3000");

  it("acepta un origen de la lista", () => {
    expect(esOrigenPermitido("https://tienda.app", permitidos)).toBe(true);
  });

  it("acepta aunque venga con barra final", () => {
    expect(esOrigenPermitido("https://tienda.app/", permitidos)).toBe(true);
  });

  it("rechaza un dominio ajeno", () => {
    expect(esOrigenPermitido("https://otra-tienda.app", permitidos)).toBe(false);
  });

  it("rechaza un subdominio que no esta en la lista", () => {
    expect(esOrigenPermitido("https://malo.tienda.app", permitidos)).toBe(false);
  });

  it("deja pasar lo que no trae cabecera Origin, como curl", () => {
    expect(esOrigenPermitido(undefined, permitidos)).toBe(true);
  });
});

describe("comprobadorDeOrigen", () => {
  const comprobar = comprobadorDeOrigen(parsearOrigenes("https://tienda.app"));

  it("responde sin error cuando el origen vale", () => {
    comprobar("https://tienda.app", (error, permitido) => {
      expect(error).toBeNull();
      expect(permitido).toBe(true);
    });
  });

  it("responde con error cuando el origen no vale", () => {
    comprobar("https://intruso.app", (error) => {
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toContain("intruso.app");
    });
  });
});

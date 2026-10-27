import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { ofertaVigente, precioVigente } from "@/lib/precio-vigente";

const AHORA = new Date("2026-06-15T12:00:00Z");

function producto(oferta: Partial<Parameters<typeof precioVigente>[0]> = {}) {
  return {
    price: new Prisma.Decimal(200),
    offerPrice: null,
    offerStartsAt: null,
    offerEndsAt: null,
    ...oferta,
  };
}

describe("sin oferta", () => {
  it("se cobra el precio normal", () => {
    expect(precioVigente(producto(), AHORA).toString()).toBe("200");
    expect(ofertaVigente(producto(), AHORA)).toBe(false);
  });
});

describe("oferta sin fechas", () => {
  const enOferta = producto({ offerPrice: new Prisma.Decimal(150) });

  it("rige siempre", () => {
    expect(ofertaVigente(enOferta, AHORA)).toBe(true);
    expect(precioVigente(enOferta, AHORA).toString()).toBe("150");
  });
});

describe("oferta con fechas", () => {
  const conFechas = producto({
    offerPrice: new Prisma.Decimal(150),
    offerStartsAt: new Date("2026-06-10T00:00:00Z"),
    offerEndsAt: new Date("2026-06-20T23:59:59Z"),
  });

  it("rige en el medio", () => {
    expect(precioVigente(conFechas, AHORA).toString()).toBe("150");
  });

  // Arranca y termina sola: nadie tiene que entrar a sacarla.
  it("antes de empezar se cobra el precio normal", () => {
    expect(precioVigente(conFechas, new Date("2026-06-01T00:00:00Z")).toString()).toBe("200");
  });

  it("después de terminar vuelve el precio normal", () => {
    expect(precioVigente(conFechas, new Date("2026-07-01T00:00:00Z")).toString()).toBe("200");
  });

  // Quien escribe "hasta el 20" piensa en todo el 20.
  it("los bordes entran", () => {
    expect(ofertaVigente(conFechas, new Date("2026-06-10T00:00:00Z"))).toBe(true);
    expect(ofertaVigente(conFechas, new Date("2026-06-20T23:59:59Z"))).toBe(true);
  });
});

describe("una sola fecha", () => {
  it("solo desde: una vez que arranca, no termina", () => {
    const desde = producto({
      offerPrice: new Prisma.Decimal(150),
      offerStartsAt: new Date("2026-06-10T00:00:00Z"),
    });

    expect(ofertaVigente(desde, AHORA)).toBe(true);
    expect(ofertaVigente(desde, new Date("2030-01-01T00:00:00Z"))).toBe(true);
    expect(ofertaVigente(desde, new Date("2026-06-01T00:00:00Z"))).toBe(false);
  });

  it("solo hasta: rige desde ya y vence ese día", () => {
    const hasta = producto({
      offerPrice: new Prisma.Decimal(150),
      offerEndsAt: new Date("2026-06-20T00:00:00Z"),
    });

    expect(ofertaVigente(hasta, new Date("2020-01-01T00:00:00Z"))).toBe(true);
    expect(ofertaVigente(hasta, AHORA)).toBe(true);
    expect(ofertaVigente(hasta, new Date("2026-07-01T00:00:00Z"))).toBe(false);
  });
});

// Un producto leído sin los campos de oferta no puede terminar cobrando un
// precio inválido: undefined vale lo mismo que null.
describe("producto leído sin los campos de oferta", () => {
  it("se cobra el precio normal", () => {
    const parcial = { price: new Prisma.Decimal(200) };

    expect(ofertaVigente(parcial, AHORA)).toBe(false);
    expect(precioVigente(parcial, AHORA).toString()).toBe("200");
  });
});

// Las fechas sin precio no abaratan nada: el esquema las rechaza, pero el
// cálculo tampoco tiene que inventar un descuento.
describe("fechas sin precio de oferta", () => {
  it("no hay oferta", () => {
    const raro = producto({
      offerStartsAt: new Date("2026-06-10T00:00:00Z"),
      offerEndsAt: new Date("2026-06-20T00:00:00Z"),
    });

    expect(ofertaVigente(raro, AHORA)).toBe(false);
    expect(precioVigente(raro, AHORA).toString()).toBe("200");
  });
});

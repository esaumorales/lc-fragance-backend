import { describe, expect, it } from "vitest";
import {
  entregasDisponibles,
  metodosDisponibles,
  motivoParaNoVender,
  puedeVender,
  type DatosDePago,
} from "@/lib/reglas-de-pago";
import { costoDeEnvio, revisarPedido } from "@/lib/validar-pedido";

function config(cambios: Partial<DatosDePago> = {}): DatosDePago {
  return {
    titular: "Henrry Pérez",
    yape: "925064242",
    banco: "BCP",
    cuenta: "19103537229057",
    cci: "00219110353722905752",
    recojoActivo: true,
    deliveryActivo: true,
    ...cambios,
  };
}

describe("qué medios de pago se ofrecen", () => {
  it("los dos cuando están completos", () => {
    expect(metodosDisponibles(config())).toEqual(["YAPE", "TRANSFERENCIA"]);
  });

  it("sin número de Yape no se ofrece Yape", () => {
    expect(metodosDisponibles(config({ yape: null }))).toEqual(["TRANSFERENCIA"]);
  });

  // Para transferir alcanza con una de las dos.
  it("la transferencia se ofrece con cuenta o con CCI", () => {
    expect(metodosDisponibles(config({ cuenta: null }))).toContain("TRANSFERENCIA");
    expect(metodosDisponibles(config({ cci: null }))).toContain("TRANSFERENCIA");
    expect(metodosDisponibles(config({ cuenta: null, cci: null }))).not.toContain("TRANSFERENCIA");
  });

  // Un campo con espacios está vacío para esto.
  it("no cuenta un campo en blanco", () => {
    expect(metodosDisponibles(config({ yape: "   " }))).not.toContain("YAPE");
  });
});

describe("si se puede vender", () => {
  it("con medios de pago y una entrega, sí", () => {
    expect(puedeVender(config())).toBe(true);
    expect(motivoParaNoVender(config())).toBeNull();
  });

  // Lo que pidió el dueño: si borran los datos, no se deja comprar y se avisa.
  it("sin ningún medio de pago, no", () => {
    const vacia = config({ yape: null, cuenta: null, cci: null });

    expect(puedeVender(vacia)).toBe(false);
    expect(motivoParaNoVender(vacia)).toMatch(/medios de pago/i);
  });

  it("con las dos entregas apagadas, tampoco", () => {
    const sinEntrega = config({ recojoActivo: false, deliveryActivo: false });

    expect(puedeVender(sinEntrega)).toBe(false);
    expect(motivoParaNoVender(sinEntrega)).toMatch(/entregas/i);
  });

  it("alcanza con una sola forma de entrega", () => {
    expect(puedeVender(config({ deliveryActivo: false }))).toBe(true);
    expect(entregasDisponibles(config({ recojoActivo: false }))).toEqual(["DELIVERY"]);
  });
});

describe("revisar un pedido", () => {
  it("acepta el que usa lo que está habilitado", () => {
    expect(revisarPedido({ metodoPago: "YAPE", entrega: "RECOJO" }, config())).toBeNull();
  });

  // La pantalla no muestra el botón, pero el pedido igual se puede mandar a
  // mano: un delivery con el delivery apagado dejaría a alguien esperando.
  it("rechaza una entrega que está apagada", () => {
    const soloRecojo = config({ deliveryActivo: false });

    expect(
      revisarPedido({ metodoPago: "YAPE", entrega: "DELIVERY", direccion: "Jr. Union 123" }, soloRecojo)
    ).toMatch(/entrega/i);
  });

  it("rechaza un medio de pago que no está cargado", () => {
    expect(
      revisarPedido({ metodoPago: "YAPE", entrega: "RECOJO" }, config({ yape: null }))
    ).toMatch(/pago/i);
  });

  it("el delivery sin dirección no se puede entregar", () => {
    expect(revisarPedido({ metodoPago: "YAPE", entrega: "DELIVERY" }, config())).toMatch(
      /dirección/i
    );
    expect(
      revisarPedido({ metodoPago: "YAPE", entrega: "DELIVERY", direccion: "  " }, config())
    ).toMatch(/dirección/i);
  });

  it("el recojo no necesita dirección", () => {
    expect(revisarPedido({ metodoPago: "YAPE", entrega: "RECOJO" }, config())).toBeNull();
  });
});

describe("el costo del envío", () => {
  it("se cobra solo en delivery", () => {
    expect(costoDeEnvio("DELIVERY", 10)).toBe(10);
    expect(costoDeEnvio("RECOJO", 10)).toBe(0);
  });

  // Por defecto es gratis hasta que el admin decida lo contrario.
  it("en cero, el delivery no suma nada", () => {
    expect(costoDeEnvio("DELIVERY", 0)).toBe(0);
  });
});

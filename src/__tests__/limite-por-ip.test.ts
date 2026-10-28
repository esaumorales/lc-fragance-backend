import { describe, expect, it } from "vitest";
import { LimitePorIp, PEDIDOS_POR_DIA } from "@/lib/limite-por-ip";

const UNA_IP = "190.12.3.4";
const OTRA_IP = "190.12.3.5";
const DIA = 24 * 60 * 60 * 1000;

describe("el tope diario", () => {
  it("deja hacer diez pedidos", () => {
    const limite = new LimitePorIp();

    for (let i = 0; i < PEDIDOS_POR_DIA; i += 1) {
      expect(limite.permite(UNA_IP)).toBe(true);
    }
  });

  it("frena el once", () => {
    const limite = new LimitePorIp();
    for (let i = 0; i < PEDIDOS_POR_DIA; i += 1) limite.permite(UNA_IP);

    expect(limite.permite(UNA_IP)).toBe(false);
  });

  // Un carrito con cincuenta frascos es un pedido: el tope cuenta checkouts,
  // no productos. Por eso una sola llamada gasta uno solo.
  it("cada pedido gasta uno, sin importar qué lleve adentro", () => {
    const limite = new LimitePorIp();

    limite.permite(UNA_IP);

    expect(limite.restantes(UNA_IP)).toBe(PEDIDOS_POR_DIA - 1);
  });

  it("una IP no gasta el cupo de otra", () => {
    const limite = new LimitePorIp();
    for (let i = 0; i < PEDIDOS_POR_DIA; i += 1) limite.permite(UNA_IP);

    expect(limite.permite(OTRA_IP)).toBe(true);
  });
});

describe("la ventana de un día", () => {
  it("al día siguiente vuelve a tener los diez", () => {
    const limite = new LimitePorIp();
    const ayer = Date.now();
    for (let i = 0; i < PEDIDOS_POR_DIA; i += 1) limite.permite(UNA_IP, ayer);

    expect(limite.permite(UNA_IP, ayer + DIA + 1000)).toBe(true);
  });

  // Es una ventana que se corre, no un contador que se borra a medianoche.
  it("los de hace veintitrés horas siguen contando", () => {
    const limite = new LimitePorIp();
    const inicio = Date.now();
    for (let i = 0; i < PEDIDOS_POR_DIA; i += 1) limite.permite(UNA_IP, inicio);

    expect(limite.permite(UNA_IP, inicio + 23 * 60 * 60 * 1000)).toBe(false);
  });
});

describe("la memoria", () => {
  // Sin limpiar, el mapa crece con cada IP que pasó alguna vez y solo se
  // vacía reiniciando el servidor.
  it("se olvida de las IP que ya no tienen nada vigente", () => {
    const limite = new LimitePorIp();
    const ayer = Date.now();
    limite.permite(UNA_IP, ayer);

    limite.limpiar(ayer + DIA + 1000);

    expect(limite.restantes(UNA_IP, ayer + DIA + 1000)).toBe(PEDIDOS_POR_DIA);
  });

  it("no se olvida de las que sí tienen pedidos vigentes", () => {
    const limite = new LimitePorIp();
    const ahora = Date.now();
    limite.permite(UNA_IP, ahora);

    limite.limpiar(ahora + 1000);

    expect(limite.restantes(UNA_IP, ahora + 1000)).toBe(PEDIDOS_POR_DIA - 1);
  });
});

describe("cuántos le quedan", () => {
  it("empieza en diez y baja de a uno", () => {
    const limite = new LimitePorIp();

    expect(limite.restantes(UNA_IP)).toBe(10);
    limite.permite(UNA_IP);
    limite.permite(UNA_IP);
    expect(limite.restantes(UNA_IP)).toBe(8);
  });

  it("nunca baja de cero", () => {
    const limite = new LimitePorIp();
    for (let i = 0; i < PEDIDOS_POR_DIA + 5; i += 1) limite.permite(UNA_IP);

    expect(limite.restantes(UNA_IP)).toBe(0);
  });
});

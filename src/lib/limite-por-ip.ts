// Cuantos pedidos puede hacer una misma IP por dia.

export const PEDIDOS_POR_DIA = 10;

/**
 * Cuenta pedidos, no productos.
 *
 * Un carrito con cincuenta frascos es un pedido. El tope existe para que
 * nadie llene la tienda de pedidos falsos, no para limitar lo que alguien
 * compra de una vez.
 */
export class LimitePorIp {
  private readonly vistas = new Map<string, number[]>();

  constructor(
    private readonly tope = PEDIDOS_POR_DIA,
    private readonly ventanaMs = 24 * 60 * 60 * 1000
  ) {}

  /** Anota el intento y dice si se puede seguir. */
  permite(ip: string, ahora = Date.now()): boolean {
    const desde = ahora - this.ventanaMs;
    // Se tiran las viejas al pasar: sin esto el mapa crece para siempre y lo
    // unico que lo vaciaria seria reiniciar el servidor.
    const recientes = (this.vistas.get(ip) ?? []).filter((momento) => momento > desde);

    if (recientes.length >= this.tope) {
      this.vistas.set(ip, recientes);
      return false;
    }

    recientes.push(ahora);
    this.vistas.set(ip, recientes);
    return true;
  }

  /** Cuantos le quedan, para poder avisarle. */
  restantes(ip: string, ahora = Date.now()): number {
    const desde = ahora - this.ventanaMs;
    const recientes = (this.vistas.get(ip) ?? []).filter((momento) => momento > desde);
    return Math.max(0, this.tope - recientes.length);
  }

  /** Saca del mapa a las IP que ya no tienen nada vigente. */
  limpiar(ahora = Date.now()): void {
    const desde = ahora - this.ventanaMs;
    for (const [ip, momentos] of this.vistas) {
      if (momentos.every((momento) => momento <= desde)) this.vistas.delete(ip);
    }
  }
}

// Cuando la tienda esta en condiciones de cobrar, y como.

export type DatosDePago = {
  titular: string | null;
  yape: string | null;
  banco: string | null;
  cuenta: string | null;
  cci: string | null;
  recojoActivo: boolean;
  deliveryActivo: boolean;
};

export type MetodoDePago = "YAPE" | "TRANSFERENCIA";
export type TipoDeEntrega = "RECOJO" | "DELIVERY";

/** Yape necesita numero; una transferencia, al menos cuenta o CCI. */
export function metodosDisponibles(datos: DatosDePago): MetodoDePago[] {
  const metodos: MetodoDePago[] = [];
  if (datos.yape?.trim()) metodos.push("YAPE");
  if (datos.cuenta?.trim() || datos.cci?.trim()) metodos.push("TRANSFERENCIA");
  return metodos;
}

export function entregasDisponibles(datos: DatosDePago): TipoDeEntrega[] {
  const entregas: TipoDeEntrega[] = [];
  if (datos.recojoActivo) entregas.push("RECOJO");
  if (datos.deliveryActivo) entregas.push("DELIVERY");
  return entregas;
}

/**
 * Si se puede comprar.
 *
 * Sin un medio de cobro cargado no hay a donde pagar, y sin forma de entrega
 * no hay como recibirlo: en cualquiera de los dos casos conviene frenar el
 * pedido antes que dejar a alguien pagando a ningun lado.
 */
export function puedeVender(datos: DatosDePago): boolean {
  return metodosDisponibles(datos).length > 0 && entregasDisponibles(datos).length > 0;
}

/** Por que no se puede, en palabras que entienda quien compra. */
export function motivoParaNoVender(datos: DatosDePago): string | null {
  if (metodosDisponibles(datos).length === 0) {
    return "Estamos configurando los medios de pago. Escribinos por WhatsApp y lo coordinamos.";
  }
  if (entregasDisponibles(datos).length === 0) {
    return "Por ahora no tenemos entregas disponibles. Escribinos por WhatsApp y lo coordinamos.";
  }
  return null;
}

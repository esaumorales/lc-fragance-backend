import type { DatosDePago, MetodoDePago, TipoDeEntrega } from "@/lib/reglas-de-pago";
import { entregasDisponibles, metodosDisponibles } from "@/lib/reglas-de-pago";

// Que un pedido sea coherente con lo que la tienda tiene habilitado.

export type DatosDelPedido = {
  metodoPago: MetodoDePago;
  entrega: TipoDeEntrega;
  direccion?: string | null;
};

/**
 * Revisa el pedido contra la configuracion de la tienda.
 *
 * Se valida aca y no solo en la pantalla: los botones que la pantalla no
 * muestra igual se pueden mandar a mano, y un pedido con delivery apagado
 * dejaria a alguien esperando un envio que nadie va a hacer.
 */
export function revisarPedido(pedido: DatosDelPedido, datos: DatosDePago): string | null {
  if (!metodosDisponibles(datos).includes(pedido.metodoPago)) {
    return "Ese medio de pago no está disponible";
  }

  if (!entregasDisponibles(datos).includes(pedido.entrega)) {
    return "Esa forma de entrega no está disponible";
  }

  // Un delivery sin direccion no se puede entregar.
  if (pedido.entrega === "DELIVERY" && !pedido.direccion?.trim()) {
    return "Para el delivery hace falta una dirección";
  }

  return null;
}

/** El envio solo se cobra cuando hay envio. */
export function costoDeEnvio(entrega: TipoDeEntrega, costoConfigurado: number): number {
  return entrega === "DELIVERY" ? costoConfigurado : 0;
}

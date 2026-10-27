import { Prisma } from "@prisma/client";

// Que precio cobra hoy un producto, con oferta o sin ella.

export type ConOferta = {
  price: Prisma.Decimal;
  // Admiten undefined ademas de null: un producto leido con un `select` que
  // no pidio estos campos no tiene que terminar cobrando un precio invalido.
  offerPrice?: Prisma.Decimal | null;
  offerStartsAt?: Date | null;
  offerEndsAt?: Date | null;
};

/**
 * Si la oferta rige en este momento.
 *
 * Cada fecha es opcional por su cuenta: sin desde, la oferta ya empezo; sin
 * hasta, no termina sola. Los bordes entran, que es lo que espera quien pone
 * "hasta el 31" pensando en todo el 31.
 */
export function ofertaVigente(producto: ConOferta, ahora: Date = new Date()): boolean {
  if (producto.offerPrice == null) return false;
  if (producto.offerStartsAt && ahora < producto.offerStartsAt) return false;
  if (producto.offerEndsAt && ahora > producto.offerEndsAt) return false;
  return true;
}

/**
 * El precio que se cobra.
 *
 * Todo lo que cobre plata (el carrito, el checkout, el pedido) tiene que pasar
 * por aca: si alguno usa `price` directo, la oferta se muestra en la vitrina
 * pero no se descuenta al pagar.
 */
export function precioVigente(producto: ConOferta, ahora: Date = new Date()): Prisma.Decimal {
  return ofertaVigente(producto, ahora) ? producto.offerPrice! : producto.price;
}

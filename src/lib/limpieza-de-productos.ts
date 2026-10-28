import type { Prisma, PrismaClient } from "@prisma/client";

// Borrado completo del catalogo, sin tocar cuentas.

/**
 * En que orden hay que vaciar las tablas.
 *
 * `CartItem`, `OrderItem` e `InventoryLog` apuntan a `Product` **sin cascada**:
 * si se intenta borrar el producto primero, Postgres rechaza el borrado por
 * clave foranea. Van las hijas y despues la madre.
 *
 * `Order` entra al final porque borrar sus renglones la dejaria como un
 * cascaron: un pedido con un total pero sin nada adentro.
 */
export const ORDEN_DE_BORRADO = [
  "inventoryLog",
  "cartItem",
  "orderItem",
  "order",
  "product",
] as const;

export type TablaBorrada = (typeof ORDEN_DE_BORRADO)[number];
export type Conteo = Record<TablaBorrada, number>;

/** Cuantas filas se irian, para poder mirar antes de borrar. */
export async function contarLoQueSeBorra(prisma: PrismaClient): Promise<Conteo> {
  const pares = await Promise.all(
    ORDEN_DE_BORRADO.map(async (tabla) => [tabla, await modelo(prisma, tabla).count()] as const)
  );
  return Object.fromEntries(pares) as Conteo;
}

/**
 * Vacia el catalogo. No toca usuarios, direcciones ni categorias.
 *
 * Va en una transaccion: si falla a la mitad no queda media base borrada.
 */
export async function borrarProductos(prisma: PrismaClient): Promise<Conteo> {
  return prisma.$transaction(async (tx) => {
    const borradas = {} as Conteo;
    // De a una y en orden: en paralelo las hijas y la madre salen a la vez y
    // la clave foranea rechaza el borrado.
    for (const tabla of ORDEN_DE_BORRADO) {
      const { count } = await modelo(tx, tabla).deleteMany({});
      borradas[tabla] = count;
    }
    return borradas;
  });
}

// Prisma no tipa el acceso por indice a sus modelos; el elenco se concentra
// aca en vez de repetirse en cada llamada.
type ClienteDeTablas = {
  [K in TablaBorrada]: {
    count(): Promise<number>;
    deleteMany(args: Record<string, never>): Promise<Prisma.BatchPayload>;
  };
};

function modelo(cliente: unknown, tabla: TablaBorrada) {
  return (cliente as ClienteDeTablas)[tabla];
}

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Hay una sola fila y siempre la misma: los datos son del negocio, no de
// cada admin. El id fijo evita tener que buscar "la primera que aparezca".
export const ID_UNICO = "unica";

export const configuracionPagoRepository = {
  /** La devuelve creandola vacia si todavia no existe. */
  obtener() {
    return prisma.configuracionDePago.upsert({
      where: { id: ID_UNICO },
      create: { id: ID_UNICO },
      update: {},
    });
  },

  guardar(datos: Prisma.ConfiguracionDePagoUpdateInput) {
    return prisma.configuracionDePago.upsert({
      where: { id: ID_UNICO },
      create: { id: ID_UNICO, ...(datos as Prisma.ConfiguracionDePagoCreateInput) },
      update: datos,
    });
  },

  /**
   * Vacia los datos de cobro en vez de borrar la fila.
   *
   * Borrarla de verdad obligaria a recrearla en cada lectura y dejaria los
   * interruptores de entrega en sus valores por defecto sin que nadie los
   * haya tocado.
   */
  vaciar() {
    return prisma.configuracionDePago.upsert({
      where: { id: ID_UNICO },
      create: { id: ID_UNICO },
      update: { titular: null, yape: null, banco: null, cuenta: null, cci: null },
    });
  },
};

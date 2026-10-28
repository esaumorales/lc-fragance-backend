/**
 * Vacia el catalogo: productos, su stock, lo que haya en carritos y los
 * pedidos. No toca usuarios, direcciones ni categorias.
 *
 * Sin --si no borra nada, solo muestra que se iria. Es a proposito: no se
 * deshace, y un borrado de una sola palabra de distancia es un accidente
 * esperando.
 *
 *   pnpm productos:borrar        ve que se iria
 *   pnpm productos:borrar --si   lo borra
 */
import { PrismaClient } from "@prisma/client";
import { borrarProductos, contarLoQueSeBorra } from "@/lib/limpieza-de-productos";

const ETIQUETAS = {
  product: "productos",
  cartItem: "renglones en carritos",
  orderItem: "renglones de pedidos",
  order: "pedidos (de cualquier estado)",
  inventoryLog: "movimientos de stock",
} as const;

async function main() {
  const prisma = new PrismaClient();
  const confirmado = process.argv.includes("--si");

  try {
    const conteo = await contarLoQueSeBorra(prisma);
    const total = Object.values(conteo).reduce((a, b) => a + b, 0);

    console.log(confirmado ? "Borrando:" : "Se borraria:");
    for (const [tabla, etiqueta] of Object.entries(ETIQUETAS)) {
      console.log(`  ${String(conteo[tabla as keyof typeof conteo]).padStart(5)}  ${etiqueta}`);
    }

    if (total === 0) {
      console.log("\nNo hay nada que borrar.");
      return;
    }

    if (!confirmado) {
      console.log("\nNo se borro nada. Volve a correrlo con --si para hacerlo de verdad.");
      return;
    }

    const borradas = await borrarProductos(prisma);
    const hechas = Object.values(borradas).reduce((a, b) => a + b, 0);
    console.log(`\nListo: ${hechas} filas borradas. Usuarios y categorias quedaron intactos.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("No se pudo borrar:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

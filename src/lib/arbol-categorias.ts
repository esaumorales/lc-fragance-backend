// Cuantos productos cuelgan de cada categoria, contando las de abajo.

export type CategoriaCruda = {
  id: string;
  parentId: string | null;
  propios: number;
};

/**
 * Suma a cada categoria los productos de sus descendientes.
 *
 * Hace falta porque una categoria padre puede no tener productos propios y
 * aun asi tener stock: si solo se miraran los propios, "Tecnologia" quedaria
 * en cero mientras sus subcategorias estan llenas, y desapareceria del menu.
 */
export function contarConDescendientes<T extends CategoriaCruda>(
  categorias: readonly T[]
): Map<string, number> {
  const padre = new Map(categorias.map((c) => [c.id, c.parentId]));
  const total = new Map(categorias.map((c) => [c.id, 0]));

  for (const categoria of categorias) {
    if (categoria.propios === 0) continue;

    // Se sube por la cadena de padres sumando en cada escalon. El visitado
    // corta los ciclos: un dato torcido en la base no puede colgar al
    // servidor en un bucle infinito.
    const visitados = new Set<string>();
    let actual: string | null = categoria.id;
    while (actual && !visitados.has(actual)) {
      visitados.add(actual);
      total.set(actual, (total.get(actual) ?? 0) + categoria.propios);
      actual = padre.get(actual) ?? null;
    }
  }

  return total;
}

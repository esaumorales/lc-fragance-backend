import { describe, expect, it } from "vitest";
import { contarConDescendientes } from "@/lib/arbol-categorias";

describe("contarConDescendientes", () => {
  it("una categoría suelta cuenta lo suyo", () => {
    const total = contarConDescendientes([{ id: "a", parentId: null, propios: 5 }]);
    expect(total.get("a")).toBe(5);
  });

  it("el padre acumula lo de sus hijos", () => {
    const total = contarConDescendientes([
      { id: "padre", parentId: null, propios: 1 },
      { id: "hijo", parentId: "padre", propios: 2 },
      { id: "otro", parentId: "padre", propios: 3 },
    ]);

    expect(total.get("padre")).toBe(6);
    expect(total.get("hijo")).toBe(2);
  });

  it("sube por toda la cadena, no solo un escalón", () => {
    const total = contarConDescendientes([
      { id: "a", parentId: null, propios: 0 },
      { id: "b", parentId: "a", propios: 0 },
      { id: "c", parentId: "b", propios: 7 },
    ]);

    expect(total.get("a")).toBe(7);
  });

  // Un hijo no hereda hacia abajo: lo del padre no es del hijo.
  it("no baja los productos del padre a los hijos", () => {
    const total = contarConDescendientes([
      { id: "padre", parentId: null, propios: 9 },
      { id: "hijo", parentId: "padre", propios: 0 },
    ]);

    expect(total.get("hijo")).toBe(0);
  });

  it("deja en cero a la que no tiene nada", () => {
    const total = contarConDescendientes([{ id: "vacia", parentId: null, propios: 0 }]);
    expect(total.get("vacia")).toBe(0);
  });

  // Un parentId que apunta a una categoría borrada no puede tirar el listado.
  it("tolera un padre que no existe", () => {
    const total = contarConDescendientes([{ id: "huerfana", parentId: "fantasma", propios: 4 }]);
    expect(total.get("huerfana")).toBe(4);
  });

  // Un ciclo en la base colgaría el servidor en un bucle infinito.
  it("no se cuelga si dos categorías son padre la una de la otra", () => {
    const total = contarConDescendientes([
      { id: "a", parentId: "b", propios: 1 },
      { id: "b", parentId: "a", propios: 1 },
    ]);

    expect(total.get("a")).toBe(2);
    expect(total.get("b")).toBe(2);
  });
});

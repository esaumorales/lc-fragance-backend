import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  CreateProductInput,
  ListProductsQuery,
  ProductSort,
  UpdateProductInput,
} from "@/schemas/product.schema";

const ORDER_BY: Record<ProductSort, Prisma.ProductOrderByWithRelationInput> = {
  recientes: { createdAt: "desc" },
  "precio-asc": { price: "asc" },
  "precio-desc": { price: "desc" },
  nombre: { name: "asc" },
};

export class StockUnderflowError extends Error {
  constructor(
    public currentStock: number,
    public change: number
  ) {
    super(`Stock insuficiente: actual ${currentStock}, cambio ${change}`);
  }
}

// Prisma tipa las columnas Json como InputJsonValue, que no acepta un
// Record<string, unknown> generico, y para los campos escalares de relacion
// hay que elegir explicitamente la variante "Unchecked". La conversion se hace
// aca, en el borde entre el dominio y el ORM, y no se filtra al servicio.
export const productRepository = {
  async findMany({ category, q, minPrice, maxPrice, inStock, sort, page, pageSize }: ListProductsQuery) {
    const price =
      minPrice !== undefined || maxPrice !== undefined
        ? {
            ...(minPrice !== undefined ? { gte: minPrice } : {}),
            ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
          }
        : undefined;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(category ? { category: { slug: category } } : {}),
      // insensitive para que "OUD" encuentre "Oud Royal".
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(price ? { price } : {}),
      ...(inStock ? { stock: { gt: 0 } } : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: ORDER_BY[sort],
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total, page, pageSize };
  },

  findById(id: string) {
    return prisma.product.findUnique({ where: { id } });
  },

  findBySlug(slug: string) {
    return prisma.product.findUnique({ where: { slug } });
  },

  findBySku(sku: string) {
    return prisma.product.findUnique({ where: { sku } });
  },

  create({ attributes, ...rest }: CreateProductInput) {
    const data: Prisma.ProductUncheckedCreateInput = {
      ...rest,
      attributes: attributes as Prisma.InputJsonObject,
    };
    return prisma.product.create({ data });
  },

  update(id: string, { attributes, ...rest }: UpdateProductInput) {
    const data: Prisma.ProductUncheckedUpdateInput = {
      ...rest,
      ...(attributes !== undefined ? { attributes: attributes as Prisma.InputJsonObject } : {}),
    };
    return prisma.product.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.product.delete({ where: { id } });
  },

  async adjustStock(id: string, change: number, reason: string) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.product.findUniqueOrThrow({ where: { id } });
      const nextStock = current.stock + change;

      if (nextStock < 0) {
        throw new StockUnderflowError(current.stock, change);
      }

      const product = await tx.product.update({
        where: { id },
        data: { stock: nextStock },
      });

      await tx.inventoryLog.create({
        data: { productId: id, change, reason },
      });

      return product;
    });
  },
};

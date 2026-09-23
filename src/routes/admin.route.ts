import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/middlewares/auth";
import { asyncHandler } from "@/middlewares/async-handler";

export const adminRouter = Router();
adminRouter.get("/admin/summary", requireAuth, requireRole("ADMIN"), asyncHandler(async (_req, res) => {
  const [products, categories, lowStock, orders, recentProducts] = await prisma.$transaction([
    prisma.product.count({ where: { isActive: true } }),
    prisma.category.count(),
    prisma.product.count({ where: { isActive: true, stock: { lte: 5 } } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, name: true, sku: true, stock: true, price: true } }),
  ]);
  res.json({ products, categories, lowStock, pendingOrders: orders, recentProducts });
}));

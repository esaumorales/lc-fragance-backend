import type { Request, Response } from "express";
import { productService } from "@/services/product.service";
import {
  adjustStockSchema,
  createProductSchema,
  listProductsQuerySchema,
  updateProductSchema,
} from "@/schemas/product.schema";
import { getStockEmitter } from "@/lib/stock-emitter";

export const productController = {
  async list(req: Request, res: Response) {
    const query = listProductsQuerySchema.parse(req.query);
    const result = await productService.list(query);
    res.json(result);
  },

  async getOne(req: Request, res: Response) {
    const product = await productService.getBySlug(req.params.slug);
    res.json(product);
  },

  async create(req: Request, res: Response) {
    const data = createProductSchema.parse(req.body);
    const product = await productService.create(data);
    res.status(201).json(product);
  },

  async update(req: Request, res: Response) {
    const data = updateProductSchema.parse(req.body);
    const product = await productService.update(req.params.id, data);
    res.json(product);
  },

  async remove(req: Request, res: Response) {
    await productService.remove(req.params.id);
    res.status(204).send();
  },

  async adjustStock(req: Request, res: Response) {
    const { change, reason } = adjustStockSchema.parse(req.body);
    const product = await productService.adjustStock(
      req.params.id,
      change,
      reason,
      getStockEmitter(req)
    );
    res.json(product);
  },
};

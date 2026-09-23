import type { Request, Response } from "express";
import { categoryService } from "@/services/category.service";
import { createCategorySchema, updateCategorySchema } from "@/schemas/category.schema";

export const categoryController = {
  async list(_req: Request, res: Response) {
    const categories = await categoryService.listAll();
    res.json(categories);
  },

  async getOne(req: Request, res: Response) {
    const category = await categoryService.getByIdOrSlug(req.params.idOrSlug);
    res.json(category);
  },

  async create(req: Request, res: Response) {
    const data = createCategorySchema.parse(req.body);
    const category = await categoryService.create(data);
    res.status(201).json(category);
  },

  async update(req: Request, res: Response) {
    const data = updateCategorySchema.parse(req.body);
    const category = await categoryService.update(req.params.id, data);
    res.json(category);
  },

  async remove(req: Request, res: Response) {
    await categoryService.remove(req.params.id);
    res.status(204).send();
  },
};

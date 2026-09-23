import type { Request } from "express";
import type { AppSocketServer } from "@/sockets";
import type { StockEmitter } from "@/services/product.service";

export function getStockEmitter(req: Request): StockEmitter | undefined {
  const io = req.app.get("io") as AppSocketServer | undefined;
  if (!io) return undefined;

  return (payload) => {
    io.emit("stock:updated", payload);
  };
}

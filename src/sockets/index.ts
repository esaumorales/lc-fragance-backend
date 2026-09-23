import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "@/config/env";
import { comprobadorDeOrigen } from "@/lib/cors-origen";

// Canales:
// - "stock:updated"   { productId, stock }         -> el catálogo actualiza en vivo
// - "order:status"    { orderId, status }           -> el cliente ve su pedido cambiar
// - "admin:newOrder"  { orderId }                   -> dashboard admin
export function createSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: comprobadorDeOrigen(env.clientUrls), credentials: true },
  });

  io.on("connection", (socket) => {
    socket.on("admin:join", () => socket.join("admin"));
    socket.on("user:join", (userId: string) => socket.join(`user:${userId}`));
  });

  return io;
}

export type AppSocketServer = ReturnType<typeof createSocketServer>;

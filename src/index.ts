import { createServer } from "http";
import { env } from "@/config/env";
import { createApp } from "@/app";
import { createSocketServer } from "@/sockets";

const app = createApp();
const httpServer = createServer(app);
const io = createSocketServer(httpServer);
app.set("io", io);

httpServer.listen(env.port, () => {
  console.log(`LC Fragance API escuchando en http://localhost:${env.port}`);
  console.log(`Docs (Scalar) en http://localhost:${env.port}/docs`);
});

import express from "express";
import { adminRouter } from "@/routes/admin.route";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { apiReference } from "@scalar/express-api-reference";
import { env } from "@/config/env";
import { healthRouter } from "@/routes/health.route";
import { categoryRouter } from "@/routes/category.route";
import { productRouter } from "@/routes/product.route";
import { authRouter } from "@/routes/auth.route";
import { cartRouter } from "@/routes/cart.route";
import { checkoutRouter } from "@/routes/checkout.route";
import { uploadRouter } from "@/routes/upload.route";
import { generateOpenApiDocument } from "@/docs/openapi";
import { comprobadorDeOrigen } from "@/lib/cors-origen";
import { errorHandler, notFoundHandler } from "@/middlewares/error-handler";

export function createApp() {
  const app = express();

  // CSP por defecto de helmet bloquea el script de Scalar (se carga desde jsdelivr
  // + un <script> inline que inicializa el visor) en /docs. Se relaja solo eso.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          "script-src": ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
        },
      },
    })
  );
  app.use(cors({ origin: comprobadorDeOrigen(env.clientUrls), credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  if (env.nodeEnv !== "test") {
    app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));
  }

  // API
  app.use("/api", healthRouter);
  app.use("/api", adminRouter);
  app.use("/api", categoryRouter);
  app.use("/api", productRouter);
  app.use("/api", authRouter);
  app.use("/api", cartRouter);
  app.use("/api", checkoutRouter);
  app.use("/api", uploadRouter);

  // Documentación: OpenAPI spec crudo + UI de Scalar
  app.get("/api/openapi.json", (_req, res) => res.json(generateOpenApiDocument()));
  app.use(
    "/docs",
    apiReference({ url: "/api/openapi.json", theme: "purple" })
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

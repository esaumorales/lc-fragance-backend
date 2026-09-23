import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "@/app";

describe("GET /api/health", () => {
  it("responde ok con un timestamp", async () => {
    const app = createApp();
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.timestamp).toBe("string");
  });
});

describe("GET /api/openapi.json", () => {
  it("expone un documento OpenAPI válido", async () => {
    const app = createApp();
    const res = await request(app).get("/api/openapi.json");

    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe("3.0.0");
    expect(res.body.paths["/api/health"]).toBeDefined();
  });
});

describe("GET /ruta-inexistente", () => {
  it("responde 404 en rutas no definidas", async () => {
    const app = createApp();
    const res = await request(app).get("/ruta-inexistente");

    expect(res.status).toBe(404);
  });
});

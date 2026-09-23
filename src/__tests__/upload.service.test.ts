import { createHash } from "crypto";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { uploadService } from "@/services/upload.service";
import { env } from "@/config/env";

describe("uploadService.firmar", () => {
  const original = { ...env.cloudinary };

  beforeEach(() => {
    env.cloudinary.cloudName = "demo-cloud";
    env.cloudinary.apiKey = "123456789";
    env.cloudinary.apiSecret = "secreto-de-prueba";
  });

  afterEach(() => {
    Object.assign(env.cloudinary, original);
    vi.useRealTimers();
  });

  it("firma el SHA-1 de los parámetros ordenados más el api secret", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const firma = uploadService.firmar();
    const esperada = createHash("sha1")
      .update(`folder=${firma.folder}&timestamp=${firma.timestamp}secreto-de-prueba`)
      .digest("hex");

    expect(firma.signature).toBe(esperada);
    expect(firma.cloudName).toBe("demo-cloud");
    expect(firma.apiKey).toBe("123456789");
  });

  it("no expone el api secret en la respuesta", () => {
    expect(JSON.stringify(uploadService.firmar())).not.toContain("secreto-de-prueba");
  });

  it("falla con 503 si Cloudinary no está configurado", () => {
    env.cloudinary.cloudName = "";
    expect(() => uploadService.firmar()).toThrowError(/no está configurado/);
  });
});

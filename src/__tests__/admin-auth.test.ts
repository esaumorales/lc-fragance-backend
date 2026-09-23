import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "@/app";
import { signAccessToken } from "@/lib/jwt";
import { loginSchema, registerSchema } from "@/schemas/auth.schema";
describe("LC account and administration", () => {
  it("normalizes email and trims names without changing passwords", () => {
    const input = registerSchema.parse({ name: "  Cliente LC  ", email: "  CLIENTE@EXAMPLE.COM ", password: " secret123 " });
    expect(input).toEqual({ name: "Cliente LC", email: "cliente@example.com", password: " secret123 " });
    expect(loginSchema.parse({ email: " CLIENTE@EXAMPLE.COM ", password: "x" }).email).toBe("cliente@example.com");
  });
  it("rejects blank names after trimming", () => {
    expect(registerSchema.safeParse({name:"   ",email:"a@example.com",password:"secret123"}).success).toBe(false);
  });
  it("requires authentication to read the dashboard", async () => {
    expect((await request(createApp()).get("/api/admin/summary")).status).toBe(401);
  });
  it("does not expose dashboard data to customers", async () => {
    const token = signAccessToken({sub:"550e8400-e29b-41d4-a716-446655440000",role:"CUSTOMER"});
    expect((await request(createApp()).get("/api/admin/summary").set("Authorization", `Bearer ${token}`)).status).toBe(403);
  });
});

import { describe, expect, it, vi, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "@/app";
import { prisma } from "@/lib/prisma";
import { signAccessToken } from "@/lib/jwt";
afterEach(() => vi.restoreAllMocks());
describe("admin dashboard summary", () => {
  it("returns inventory and pending orders to authenticated administrators", async () => {
    const recent = [{id:"p1",name:"LC",sku:"LC-1",stock:3,price:"89.90"}];
    vi.spyOn(prisma, "$transaction").mockResolvedValue([12, 3, 2, 4, recent]);
    const token = signAccessToken({sub:"550e8400-e29b-41d4-a716-446655440000",role:"ADMIN"});
    const response = await request(createApp()).get("/api/admin/summary").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({products:12,categories:3,lowStock:2,pendingOrders:4,recentProducts:recent});
  });
});

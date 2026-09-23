import { describe, expect, it } from "vitest";
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/lib/jwt";

describe("access token", () => {
  it("firma y verifica un token válido, preservando el payload", () => {
    const token = signAccessToken({ sub: "user-123", role: "CUSTOMER" });
    const payload = verifyAccessToken(token);

    expect(payload.sub).toBe("user-123");
    expect(payload.role).toBe("CUSTOMER");
  });

  it("rechaza un token manipulado", () => {
    const token = signAccessToken({ sub: "user-123", role: "CUSTOMER" });
    const tampered = token.slice(0, -2) + "xx";

    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});

describe("refresh token", () => {
  it("firma y verifica un refresh token válido", () => {
    const token = signRefreshToken({ sub: "user-123" });
    const payload = verifyRefreshToken(token);

    expect(payload.sub).toBe("user-123");
  });
});

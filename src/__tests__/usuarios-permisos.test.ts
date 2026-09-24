import { describe, expect, it, vi, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "@/app";
import { signAccessToken } from "@/lib/jwt";
import { adminUserService } from "@/services/admin-user.service";
import { confirmacionService } from "@/services/confirmacion.service";
import { ApiError } from "@/middlewares/error-handler";

afterEach(() => {
  vi.restoreAllMocks();
});

const CLIENTE = "550e8400-e29b-41d4-a716-446655440000";
const ADMIN = "660e8400-e29b-41d4-a716-446655440001";
const DUENIO = "770e8400-e29b-41d4-a716-446655440002";
const OBJETIVO = "880e8400-e29b-41d4-a716-446655440003";

const token = {
  cliente: signAccessToken({ sub: CLIENTE, role: "CUSTOMER" }),
  admin: signAccessToken({ sub: ADMIN, role: "ADMIN" }),
  duenio: signAccessToken({ sub: DUENIO, role: "SUPERADMIN" }),
};

describe("ver la lista de usuarios", () => {
  it("sin sesión, no", async () => {
    expect((await request(createApp()).get("/api/admin/usuarios")).status).toBe(401);
  });

  it("un cliente tampoco", async () => {
    const res = await request(createApp())
      .get("/api/admin/usuarios")
      .set("Authorization", `Bearer ${token.cliente}`);
    expect(res.status).toBe(403);
  });

  // Ver quién compró y a dónde enviarle es parte del trabajo de un admin.
  it("un admin sí, con el conteo", async () => {
    vi.spyOn(adminUserService, "listar").mockResolvedValue({
      total: 3,
      porRol: { CUSTOMER: 1, ADMIN: 1, SUPERADMIN: 1 },
      usuarios: [],
    } as never);

    const res = await request(createApp())
      .get("/api/admin/usuarios")
      .set("Authorization", `Bearer ${token.admin}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
  });
});

describe("tocar cuentas", () => {
  it("un admin no puede suspender a nadie", async () => {
    const res = await request(createApp())
      .patch(`/api/admin/usuarios/${OBJETIVO}`)
      .set("Authorization", `Bearer ${token.admin}`)
      .send({ isActive: false });

    expect(res.status).toBe(403);
  });

  it("un admin no puede eliminar a nadie", async () => {
    const res = await request(createApp())
      .delete(`/api/admin/usuarios/${OBJETIVO}`)
      .set("Authorization", `Bearer ${token.admin}`);

    expect(res.status).toBe(403);
  });

  // 428 y no 401: el frontend lo usa para saber que tiene que pedir el código,
  // distinto de un código equivocado.
  it("el dueño sin código recibe 428", async () => {
    const res = await request(createApp())
      .patch(`/api/admin/usuarios/${OBJETIVO}`)
      .set("Authorization", `Bearer ${token.duenio}`)
      .send({ isActive: false });

    expect(res.status).toBe(428);
  });

  it("con un código equivocado, 401 y no se toca nada", async () => {
    vi.spyOn(confirmacionService, "validar").mockRejectedValue(
      new ApiError(401, "Código inválido")
    );
    const actualizar = vi.spyOn(adminUserService, "actualizar");

    const res = await request(createApp())
      .patch(`/api/admin/usuarios/${OBJETIVO}`)
      .set("Authorization", `Bearer ${token.duenio}`)
      .set("x-confirmacion-id", "ee0e8400-e29b-41d4-a716-446655440061")
      .set("x-confirmacion-codigo", "000000")
      .send({ isActive: false });

    expect(res.status).toBe(401);
    expect(actualizar).not.toHaveBeenCalled();
  });

  it("con el código correcto, la acción se ejecuta", async () => {
    vi.spyOn(confirmacionService, "validar").mockResolvedValue(undefined);
    const actualizar = vi
      .spyOn(adminUserService, "actualizar")
      .mockResolvedValue({ id: OBJETIVO, isActive: false } as never);

    const res = await request(createApp())
      .patch(`/api/admin/usuarios/${OBJETIVO}`)
      .set("Authorization", `Bearer ${token.duenio}`)
      .set("x-confirmacion-id", "ee0e8400-e29b-41d4-a716-446655440061")
      .set("x-confirmacion-codigo", "123456")
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(actualizar).toHaveBeenCalledWith(DUENIO, OBJETIVO, { isActive: false });
  });

  it("eliminar también exige el código", async () => {
    vi.spyOn(confirmacionService, "validar").mockResolvedValue(undefined);
    const eliminar = vi.spyOn(adminUserService, "eliminar").mockResolvedValue(undefined);

    const res = await request(createApp())
      .delete(`/api/admin/usuarios/${OBJETIVO}`)
      .set("Authorization", `Bearer ${token.duenio}`)
      .set("x-confirmacion-id", "ee0e8400-e29b-41d4-a716-446655440061")
      .set("x-confirmacion-codigo", "123456");

    expect(res.status).toBe(204);
    expect(eliminar).toHaveBeenCalledWith(DUENIO, OBJETIVO);
  });
});

describe("pedir el código", () => {
  it("un admin común no puede pedirlo", async () => {
    const res = await request(createApp())
      .post("/api/admin/confirmacion")
      .set("Authorization", `Bearer ${token.admin}`);

    expect(res.status).toBe(403);
  });

  it("el dueño sí, y le devuelven el identificador", async () => {
    vi.spyOn(confirmacionService, "pedir").mockResolvedValue({
      confirmacionId: "ee0e8400-e29b-41d4-a716-446655440061",
      correoEnviado: true,
    });

    const res = await request(createApp())
      .post("/api/admin/confirmacion")
      .set("Authorization", `Bearer ${token.duenio}`);

    expect(res.status).toBe(200);
    expect(res.body.correoEnviado).toBe(true);
    // El código nunca viaja en la respuesta: va al correo.
    expect(JSON.stringify(res.body)).not.toMatch(/\b\d{6}\b/);
  });
});

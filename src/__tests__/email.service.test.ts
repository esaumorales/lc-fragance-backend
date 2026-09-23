import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emailService, plantillas } from "@/services/email.service";
import { env } from "@/config/env";

const original = { ...env.resend };

beforeEach(() => {
  env.resend.apiKey = "re_clave_de_prueba";
  env.resend.emailFrom = "LC Fragance <onboarding@resend.dev>";
});

afterEach(() => {
  Object.assign(env.resend, original);
  vi.restoreAllMocks();
});

function respuesta(ok: boolean, cuerpo: unknown, status = ok ? 200 : 403) {
  return { ok, status, json: async () => cuerpo } as Response;
}

describe("emailService.estaConfigurado", () => {
  it("es falso sin clave", () => {
    env.resend.apiKey = "";
    expect(emailService.estaConfigurado()).toBe(false);
  });

  it("es verdadero con clave", () => {
    expect(emailService.estaConfigurado()).toBe(true);
  });
});

describe("emailService.enviar", () => {
  it("no intenta nada si falta la clave y explica por qué", async () => {
    env.resend.apiKey = "";
    const fetchSpy = vi.spyOn(global, "fetch");

    const resultado = await emailService.enviar({ para: "a@b.com", asunto: "Hola", html: "<p>x</p>" });

    expect(resultado).toEqual({ enviado: false, motivo: "Falta RESEND_API_KEY en el servidor" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("arma el cuerpo que espera Resend y autentica con la clave", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(respuesta(true, { id: "1" }));

    const resultado = await emailService.enviar({
      para: "duenio@example.com",
      asunto: "Tu código",
      html: "<p>123456</p>",
    });

    expect(resultado).toEqual({ enviado: true });
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_clave_de_prueba");
    expect(JSON.parse(init.body as string)).toEqual({
      from: "LC Fragance <onboarding@resend.dev>",
      to: ["duenio@example.com"],
      subject: "Tu código",
      html: "<p>123456</p>",
    });
  });

  it("devuelve el motivo que da Resend cuando rechaza", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      respuesta(false, { message: "The lyoncall.com domain is not verified" })
    );

    const resultado = await emailService.enviar({ para: "a@b.com", asunto: "x", html: "<p>x</p>" });

    expect(resultado).toEqual({
      enviado: false,
      motivo: "The lyoncall.com domain is not verified",
    });
  });

  it("no revienta si Resend responde algo que no es JSON", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error("no es json");
      },
    } as unknown as Response);

    const resultado = await emailService.enviar({ para: "a@b.com", asunto: "x", html: "<p>x</p>" });

    expect(resultado).toEqual({ enviado: false, motivo: "Resend respondió 502" });
  });

  // Que el correo falle no puede tumbar un login ni el alta de un admin.
  it("no lanza si la red se cae", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));

    const resultado = await emailService.enviar({ para: "a@b.com", asunto: "x", html: "<p>x</p>" });

    expect(resultado).toEqual({ enviado: false, motivo: "ECONNREFUSED" });
  });
});

describe("plantillas", () => {
  it("muestra el código y los minutos de vigencia", () => {
    const html = plantillas.codigoDeAcceso("Esau", "123456", 10);
    expect(html).toContain("123456");
    expect(html).toContain("10 minutos");
  });

  // El nombre lo escribe quien da de alta al admin: sin escapar entra HTML.
  it("escapa el nombre para que no inyecte HTML en el correo", () => {
    const html = plantillas.invitacion('<script>alert("x")</script>', "https://tienda.app/i", 24);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapa también el enlace", () => {
    const html = plantillas.restablecer("Ana", 'https://x.app/"><img src=y', 24);
    expect(html).not.toContain('"><img');
  });
});

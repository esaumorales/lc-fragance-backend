import { env } from "@/config/env";

export type ResultadoDeEnvio =
  | { enviado: true }
  // No se lanza error: crear un admin o pedir un codigo tiene que funcionar
  // aunque el correo no este configurado o Resend falle.
  | { enviado: false; motivo: string };

type Mensaje = {
  para: string;
  asunto: string;
  html: string;
};

const API = "https://api.resend.com/emails";

export const emailService = {
  estaConfigurado(): boolean {
    return Boolean(env.resend.apiKey);
  },

  async enviar({ para, asunto, html }: Mensaje): Promise<ResultadoDeEnvio> {
    if (!this.estaConfigurado()) {
      return { enviado: false, motivo: "Falta RESEND_API_KEY en el servidor" };
    }

    try {
      const res = await fetch(API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.resend.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: env.resend.emailFrom, to: [para], subject: asunto, html }),
      });

      if (!res.ok) {
        const detalle = (await res.json().catch(() => ({}))) as { message?: string };
        return { enviado: false, motivo: detalle.message ?? `Resend respondió ${res.status}` };
      }

      return { enviado: true };
    } catch (error) {
      return { enviado: false, motivo: error instanceof Error ? error.message : "Error de red" };
    }
  },
};

export { plantillas } from "@/services/plantillas-correo";

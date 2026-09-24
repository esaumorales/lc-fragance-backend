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

// Las plantillas viven aca para que los servicios no armen HTML a mano.
export const plantillas = {
  codigoDeAcceso(nombre: string, codigo: string, minutos: number): Mensaje["html"] {
    return `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#1a1a1a">Tu código de acceso</h2>
        <p>Hola ${escapar(nombre)}, este es el código para entrar al panel:</p>
        <p style="font-size:32px;letter-spacing:8px;font-weight:700;margin:24px 0">${escapar(codigo)}</p>
        <p style="color:#666">Vence en ${minutos} minutos y sirve una sola vez.</p>
        <p style="color:#666">Si no fuiste vos, alguien tiene tu contraseña: cambiala.</p>
      </div>
    `;
  },

  codigoDeAccion(nombre: string, codigo: string, minutos: number): Mensaje["html"] {
    return `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#1a1a1a">Confirmá la acción</h2>
        <p>Hola ${escapar(nombre)}, alguien con tu sesión abierta pidió hacer un cambio delicado en el panel.</p>
        <p style="font-size:32px;letter-spacing:8px;font-weight:700;margin:24px 0">${escapar(codigo)}</p>
        <p style="color:#666">Vence en ${minutos} minutos y sirve una sola vez.</p>
        <p style="color:#666">Si no fuiste vos, cerrá sesión y cambiá tu contraseña.</p>
      </div>
    `;
  },

  invitacion(nombre: string, enlace: string, horas: number): Mensaje["html"] {
    return `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#1a1a1a">Te dieron acceso a LC Fragance</h2>
        <p>Hola ${escapar(nombre)}, ya podés entrar al panel de administración.</p>
        <p style="margin:24px 0">
          <a href="${escapar(enlace)}" style="background:#1a1a1a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">
            Elegir mi contraseña
          </a>
        </p>
        <p style="color:#666">El enlace vence en ${horas} horas y sirve una sola vez.</p>
      </div>
    `;
  },

  restablecer(nombre: string, enlace: string, horas: number): Mensaje["html"] {
    return `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#1a1a1a">Restablecer tu contraseña</h2>
        <p>Hola ${escapar(nombre)}, pediste cambiar tu contraseña.</p>
        <p style="margin:24px 0">
          <a href="${escapar(enlace)}" style="background:#1a1a1a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">
            Poner una nueva
          </a>
        </p>
        <p style="color:#666">El enlace vence en ${horas} horas. Si no fuiste vos, ignorá este correo.</p>
      </div>
    `;
  },
};

// El nombre lo elige quien crea al admin: sin escapar, entra HTML en el correo.
function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

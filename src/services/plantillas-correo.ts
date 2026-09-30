import { env } from "@/config/env";

// Paleta de la marca, la misma del sitio.
const FONDO = "#0b0b0b";
const PANEL = "#141311";
const TEXTO = "#f5f1e7";
const SUAVE = "#b3ad9f";
const ORO = "#d4af37";
const LINEA = "#343026";

// El nombre lo elige una persona: sin escapar, entra HTML en el correo.
export function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function urlDelSitio(): string {
  return env.clientUrls[0] ?? "http://localhost:3000";
}

/**
 * Arma el correo con el emblema, la paleta y la estructura de la marca.
 *
 * Va con tablas y estilos en linea y no con clases: el correo lo renderiza
 * Gmail u Outlook, que ignoran las hojas de estilo y buena parte de flex.
 *
 * Casi todos los clientes bloquean las imagenes hasta que el lector las
 * acepta, asi que el emblema lleva texto alternativo y el diseño se sostiene
 * igual sin el: nunca es lo unico que identifica al remitente.
 */
function envoltura(titulo: string, cuerpo: string): string {
  const sitio = urlDelSitio();

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${FONDO};">
  <!-- Se ve en la vista previa de la bandeja, antes de abrir. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapar(titulo)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FONDO};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${PANEL};border:1px solid ${LINEA};border-radius:12px;overflow:hidden;">

        <tr><td align="center" style="padding:34px 32px 26px;border-bottom:1px solid ${LINEA};">
          <img src="${sitio}/brand/emblem-email.png" width="86" alt="LC Fragance"
               style="display:block;border:0;width:86px;height:auto;">
          <p style="margin:16px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:19px;letter-spacing:.16em;color:${TEXTO};text-transform:uppercase;">
            LC Fragance
          </p>
          <p style="margin:6px 0 0;font-family:Arial,sans-serif;font-size:10px;letter-spacing:.24em;color:${ORO};text-transform:uppercase;">
            El arte de distinguirte
          </p>
        </td></tr>

        <tr><td style="padding:32px;font-family:Arial,Helvetica,sans-serif;color:${TEXTO};">
          ${cuerpo}
        </td></tr>

        <tr><td style="padding:20px 32px 26px;border-top:1px solid ${LINEA};">
          <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;line-height:1.7;color:${SUAVE};">
            Este correo es automático, no hace falta responderlo.<br>
            <a href="${sitio}" style="color:${ORO};text-decoration:none;">${escapar(sitio.replace(/^https?:\/\//, ""))}</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function encabezado(texto: string): string {
  return `<h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:25px;font-weight:400;line-height:1.25;color:${TEXTO};">${escapar(texto)}</h1>`;
}

function parrafo(texto: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${SUAVE};">${texto}</p>`;
}

function nota(texto: string): string {
  return `<p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:${SUAVE};">${escapar(texto)}</p>`;
}

// El codigo se muestra separado y grande: se copia de un vistazo.
function bloqueDeCodigo(codigo: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 4px;">
    <tr><td align="center" style="background:${FONDO};border:1px solid ${ORO};border-radius:10px;padding:22px 16px;">
      <p style="margin:0;font-family:'Courier New',monospace;font-size:34px;font-weight:700;letter-spacing:12px;color:${ORO};">${escapar(codigo)}</p>
    </td></tr>
  </table>`;
}

// Boton en tabla: Outlook no respeta padding sobre un <a> suelto.
function boton(texto: string, enlace: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px;">
    <tr><td align="center" style="background:${ORO};border-radius:8px;">
      <a href="${escapar(enlace)}" style="display:inline-block;padding:14px 30px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:.06em;color:${FONDO};text-decoration:none;">${escapar(texto)}</a>
    </td></tr>
  </table>
  <p style="margin:14px 0 0;font-size:11px;line-height:1.6;color:${SUAVE};">
    Si el botón no funciona, copiá este enlace:<br>
    <a href="${escapar(enlace)}" style="color:${ORO};word-break:break-all;">${escapar(enlace)}</a>
  </p>`;
}

export const plantillas = {
  codigoDeAcceso(nombre: string, codigo: string, minutos: number): string {
    return envoltura(
      `Tu código de acceso es ${codigo}`,
      encabezado("Tu código de acceso") +
        parrafo(`Hola <strong style="color:${TEXTO};">${escapar(nombre)}</strong>, usá este código para entrar al panel:`) +
        bloqueDeCodigo(codigo) +
        nota(`Vence en ${minutos} minutos y sirve una sola vez.`) +
        nota("Si no fuiste vos, alguien tiene tu contraseña: cambiala cuanto antes.")
    );
  },

  codigoDeAccion(nombre: string, codigo: string, minutos: number): string {
    return envoltura(
      `Código para confirmar la acción: ${codigo}`,
      encabezado("Confirmá la acción") +
        parrafo(`Hola <strong style="color:${TEXTO};">${escapar(nombre)}</strong>, se pidió un cambio delicado en el panel desde tu sesión.`) +
        bloqueDeCodigo(codigo) +
        nota(`Vence en ${minutos} minutos y sirve una sola vez.`) +
        nota("Si no fuiste vos, cerrá sesión y cambiá tu contraseña.")
    );
  },

  invitacion(nombre: string, enlace: string, horas: number): string {
    return envoltura(
      "Te dieron acceso al panel de LC Fragance",
      encabezado("Bienvenido al panel") +
        parrafo(`Hola <strong style="color:${TEXTO};">${escapar(nombre)}</strong>, ya podés administrar la tienda. Elegí tu contraseña para empezar.`) +
        boton("Elegir mi contraseña", enlace) +
        nota(`El enlace vence en ${horas} horas y sirve una sola vez.`)
    );
  },

  restablecer(nombre: string, enlace: string, horas: number): string {
    return envoltura(
      "Restablecer tu contraseña",
      encabezado("Restablecer tu contraseña") +
        parrafo(`Hola <strong style="color:${TEXTO};">${escapar(nombre)}</strong>, pediste cambiar tu contraseña.`) +
        boton("Poner una nueva", enlace) +
        nota(`El enlace vence en ${horas} horas.`) +
        nota("Si no fuiste vos, ignorá este correo: tu contraseña no cambia sola.")
    );
  },
};

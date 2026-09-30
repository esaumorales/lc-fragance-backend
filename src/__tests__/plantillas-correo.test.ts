import { describe, expect, it } from "vitest";
import { plantillas } from "@/services/plantillas-correo";
import { env } from "@/config/env";

const TODAS = [
  ["codigoDeAcceso", plantillas.codigoDeAcceso("Esau", "123456", 10)],
  ["codigoDeAccion", plantillas.codigoDeAccion("Esau", "123456", 10)],
  ["invitacion", plantillas.invitacion("Esau", "https://tienda.app/invitacion?token=abc", 24)],
  ["restablecer", plantillas.restablecer("Esau", "https://tienda.app/restablecer?token=abc", 24)],
] as const;

describe("todas las plantillas", () => {
  it.each(TODAS)("%s lleva el emblema y la marca", (_nombre, html) => {
    expect(html).toContain("/brand/emblem-email.png");
    expect(html).toContain("LC Fragance");
  });

  // Gmail y Outlook ignoran las hojas de estilo: todo va en linea.
  it.each(TODAS)("%s no usa clases ni hojas de estilo", (_nombre, html) => {
    expect(html).not.toContain("<style");
    expect(html).not.toMatch(/class=/);
  });

  it.each(TODAS)("%s usa el dorado de la marca", (_nombre, html) => {
    expect(html.toLowerCase()).toContain("#d4af37");
  });

  // Casi todos los clientes bloquean las imagenes hasta que el lector acepta.
  it.each(TODAS)("%s se entiende aunque no carguen las imágenes", (_nombre, html) => {
    expect(html).toContain('alt="LC Fragance"');
    const sinImagenes = html.replace(/<img[^>]*>/g, "");
    expect(sinImagenes).toContain("LC Fragance");
  });

  it.each(TODAS)("%s tiene texto de vista previa para la bandeja", (_nombre, html) => {
    expect(html).toMatch(/display:none;max-height:0/);
  });
});

describe("los códigos", () => {
  it("se muestran completos y separados", () => {
    const html = plantillas.codigoDeAcceso("Esau", "483920", 10);
    expect(html).toContain("483920");
    expect(html).toContain("letter-spacing:12px");
  });

  it("el de acción dice que es una acción, no un ingreso", () => {
    expect(plantillas.codigoDeAccion("Esau", "123456", 10)).toContain("Confirmá la acción");
    expect(plantillas.codigoDeAcceso("Esau", "123456", 10)).toContain("Tu código de acceso");
  });
});

describe("los enlaces", () => {
  // Outlook come los botones con frecuencia; el enlace crudo siempre queda.
  it("van en un botón y también en texto, por si el botón falla", () => {
    const enlace = "https://tienda.app/invitacion?token=abc";
    const html = plantillas.invitacion("Esau", enlace, 24);

    expect(html).toContain(`href="${enlace}"`);
    expect(html).toContain("Si el botón no funciona");
    expect(html.split(enlace).length - 1).toBeGreaterThanOrEqual(2);
  });
});

describe("el contenido que escribe una persona", () => {
  it("se escapa: un nombre no puede meter HTML en el correo", () => {
    const html = plantillas.invitacion('<script>alert("x")</script>', "https://t.app/i", 24);

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("también se escapa el enlace", () => {
    const html = plantillas.restablecer("Ana", 'https://t.app/"><img src=y', 24);
    expect(html).not.toContain('"><img');
  });
});

describe("el pie", () => {
  it("apunta al sitio configurado", () => {
    const html = plantillas.codigoDeAcceso("Esau", "123456", 10);
    expect(html).toContain(env.clientUrls[0]!);
  });
});

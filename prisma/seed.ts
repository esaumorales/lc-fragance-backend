import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@lyoncall.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "LyonCallAdmin123";

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Admin Lyon Call",
      email: adminEmail,
      password: await argon2.hash(adminPassword),
      role: "ADMIN",
    },
  });
  console.log(`Admin listo: ${adminEmail} / ${adminPassword} (cambiar en producción)`);

  const perfumes = await prisma.category.upsert({
    where: { slug: "perfumes" },
    update: {},
    create: { name: "Perfumes", slug: "perfumes" },
  });

  const tecnologia = await prisma.category.upsert({
    where: { slug: "tecnologia" },
    update: {},
    create: { name: "Tecnología", slug: "tecnologia" },
  });

  await prisma.product.upsert({
    where: { sku: "PERF-001" },
    update: {},
    create: {
      name: "Bleu Nocturne",
      slug: "bleu-nocturne",
      description: "Fragancia amaderada con notas de sándalo y bergamota.",
      price: 89.9,
      sku: "PERF-001",
      stock: 25,
      images: [],
      attributes: { mlVolume: 100, notasOlfativas: ["sándalo", "bergamota"], genero: "unisex" },
      categoryId: perfumes.id,
    },
  });

  await prisma.product.upsert({
    where: { sku: "PERF-002" },
    update: {},
    create: {
      name: "Rose Absolue",
      slug: "rose-absolue",
      description: "Fragancia floral intensa con rosa búlgara.",
      price: 74.5,
      sku: "PERF-002",
      stock: 40,
      images: [],
      attributes: { mlVolume: 50, notasOlfativas: ["rosa", "almizcle"], genero: "femenino" },
      categoryId: perfumes.id,
    },
  });

  await prisma.product.upsert({
    where: { sku: "TECH-001" },
    update: {},
    create: {
      name: "Fono X12",
      slug: "fono-x12",
      description: "Celular gama media con pantalla AMOLED de 6.5 pulgadas.",
      price: 320,
      sku: "TECH-001",
      stock: 12,
      images: [],
      attributes: { ram: "8GB", almacenamiento: "128GB", marca: "Fono" },
      categoryId: tecnologia.id,
    },
  });

  console.log("Seed completado.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

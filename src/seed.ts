import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { resolverAdminInicial } from "@/lib/admin-inicial";

const prisma = new PrismaClient();

async function main() {
  const admin = resolverAdminInicial(process.env);

  await prisma.user.upsert({
    where: { email: admin.email },
    // Se le asegura el rol tambien si ya existia: es la cuenta del dueño y
    // sin SUPERADMIN activo nadie puede dar de alta administradores.
    update: { role: "SUPERADMIN", isActive: true },
    create: {
      name: "Admin LC Fragance",
      email: admin.email,
      password: await argon2.hash(admin.password),
      role: "SUPERADMIN",
    },
  });

  // La clave real no se imprime: el stdout del contenedor queda en los logs.
  console.log(
    admin.esDeDesarrollo
      ? `Admin listo: ${admin.email} / ${admin.password} (clave de desarrollo)`
      : `Admin listo: ${admin.email} (clave tomada de ADMIN_PASSWORD)`
  );

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

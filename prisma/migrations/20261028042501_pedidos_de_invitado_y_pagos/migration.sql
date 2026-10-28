/*
  Warnings:

  - Added the required column `celular` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `correo` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `metodoPago` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nombre` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoDeEntrega" AS ENUM ('RECOJO', 'DELIVERY');

-- CreateEnum
CREATE TYPE "MetodoDePago" AS ENUM ('YAPE', 'TRANSFERENCIA');

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "aceptadoEn" TIMESTAMP(3),
ADD COLUMN     "celular" TEXT NOT NULL,
ADD COLUMN     "correo" TEXT NOT NULL,
ADD COLUMN     "costoEnvio" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "direccion" TEXT,
ADD COLUMN     "entrega" "TipoDeEntrega" NOT NULL DEFAULT 'RECOJO',
ADD COLUMN     "metodoPago" "MetodoDePago" NOT NULL,
ADD COLUMN     "nombre" TEXT NOT NULL,
ADD COLUMN     "nota" TEXT,
ADD COLUMN     "plazo" TEXT,
ADD COLUMN     "voucherUrl" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ConfiguracionDePago" (
    "id" TEXT NOT NULL DEFAULT 'unica',
    "titular" TEXT,
    "yape" TEXT,
    "banco" TEXT,
    "cuenta" TEXT,
    "cci" TEXT,
    "correoDeAvisos" TEXT,
    "recojoActivo" BOOLEAN NOT NULL DEFAULT true,
    "deliveryActivo" BOOLEAN NOT NULL DEFAULT true,
    "costoDelivery" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionDePago_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

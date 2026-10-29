-- Sin NOT NULL: la tabla ya tiene pedidos y los anteriores a este campo no
-- tienen documento. El checkout lo exige para los nuevos.
ALTER TABLE "Order" ADD COLUMN "dni" TEXT;

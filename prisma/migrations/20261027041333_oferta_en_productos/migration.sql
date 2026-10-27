-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "offerEndsAt" TIMESTAMP(3),
ADD COLUMN     "offerPrice" DECIMAL(10,2),
ADD COLUMN     "offerStartsAt" TIMESTAMP(3);

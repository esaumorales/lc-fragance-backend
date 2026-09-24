-- CreateEnum
CREATE TYPE "CodePurpose" AS ENUM ('LOGIN', 'ACTION');

-- AlterTable
ALTER TABLE "VerificationCode" ADD COLUMN     "purpose" "CodePurpose" NOT NULL DEFAULT 'LOGIN';

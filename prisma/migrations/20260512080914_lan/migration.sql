-- CreateEnum
CREATE TYPE "Language" AS ENUM ('EN', 'ES', 'FR');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "preferred_language" "Language" NOT NULL DEFAULT 'EN';
